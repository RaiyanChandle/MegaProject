import { 
  Student, 
  Department, 
  Division, 
  Class, 
  Subject, 
  Enrollment,
  AttendanceRecord, 
  AttendanceSession, 
  SubjectResult, 
  ComponentMark, 
  AssessmentComponent, 
  Assignment, 
  Submission, 
  FeeStructure, 
  FeePayment, 
  Announcement,
  AcademicTerm
} from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Gather a comprehensive, real-time academic dossier for a student.
 */
export async function getStudentAcademicDossier(studentId) {
  // 1. Student Identity & Program Info
  const student = await Student.findByPk(studentId, {
    attributes: ['id', 'name', 'rollNumber', 'instituteId', 'batchYear', 'departmentId', 'divisionId'],
    include: [
      { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
      { 
        model: Division, 
        as: 'division', 
        attributes: ['id', 'name'],
        include: [{ model: Class, as: 'class', attributes: ['id', 'name', 'semesterNumber'] }]
      }
    ]
  });

  if (!student) {
    throw new Error('Student record not found.');
  }

  // 2. Attendance Metrics
  const attendanceRecords = await AttendanceRecord.findAll({
    where: { studentId },
    include: [
      {
        model: AttendanceSession,
        as: 'session',
        attributes: ['id', 'date', 'startTime', 'endTime', 'topic', 'subjectId'],
        include: [
          { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }
        ]
      }
    ]
  });

  const subjectAttendanceMap = new Map();
  let totalAttended = 0;
  let totalConducted = 0;

  attendanceRecords.forEach(rec => {
    const session = rec.session;
    if (!session || !session.subject) return;

    const subId = session.subject.id;
    const subName = session.subject.name;
    const subCode = session.subject.code;

    if (!subjectAttendanceMap.has(subId)) {
      subjectAttendanceMap.set(subId, {
        name: subName,
        code: subCode,
        conducted: 0,
        attended: 0
      });
    }

    const stat = subjectAttendanceMap.get(subId);
    stat.conducted += 1;
    totalConducted += 1;

    if (rec.present) {
      stat.attended += 1;
      totalAttended += 1;
    }
  });

  const subjectAttendanceList = Array.from(subjectAttendanceMap.values()).map(s => {
    const pct = s.conducted > 0 ? Math.round((s.attended / s.conducted) * 1000) / 10 : 0;
    return {
      ...s,
      percentage: pct,
      isLow: pct < 75
    };
  });

  const overallAttendancePct = totalConducted > 0 
    ? Math.round((totalAttended / totalConducted) * 1000) / 10 
    : 0;

  // 3. Marks & Examination Results (via Enrollments)
  const enrollments = await Enrollment.findAll({
    where: { studentId },
    include: [
      { 
        model: Subject, 
        as: 'subject', 
        attributes: ['id', 'name', 'code', 'credits'] 
      },
      { 
        model: SubjectResult, 
        as: 'subjectResult', 
        attributes: ['id', 'totalMarksObtained', 'totalMaxMarks', 'isPass'] 
      }
    ]
  });

  const marksList = enrollments.map(enr => {
    const sr = enr.subjectResult;
    return {
      subjectName: enr.subject?.name || 'Subject',
      subjectCode: enr.subject?.code || 'SUB',
      totalMarks: sr ? `${sr.totalMarksObtained || 0}/${sr.totalMaxMarks || 100}` : 'In Progress',
      isPass: sr ? sr.isPass : null,
      grade: sr ? (sr.isPass ? 'Passed' : 'Needs Retake') : 'In Progress'
    };
  });

  const passedCount = marksList.filter(m => m.isPass === true).length;
  const totalEvaluated = marksList.filter(m => m.isPass !== null).length;

  // 4. Assignments & Homework
  let assignmentsList = [];
  let pendingAssignments = [];
  let overdueAssignments = [];

  if (student.divisionId) {
    const rawAssignments = await Assignment.findAll({
      where: { divisionId: student.divisionId },
      include: [
        { model: Subject, as: 'subject', attributes: ['name', 'code'] },
        { 
          model: Submission, 
          as: 'submissions', 
          where: { studentId }, 
          required: false,
          attributes: ['id', 'submittedAt', 'status', 'marksAwarded']
        }
      ],
      order: [['deadline', 'ASC']]
    });

    const now = new Date();

    assignmentsList = rawAssignments.map(a => {
      const submission = a.submissions && a.submissions.length > 0 ? a.submissions[0] : null;
      const hasSubmitted = !!submission;
      const isPastDeadline = a.deadline && new Date(a.deadline) < now;

      const item = {
        title: a.title,
        subject: a.subject?.name || 'Course',
        dueDate: a.deadline ? new Date(a.deadline).toLocaleDateString('en-IN') : 'N/A',
        hasSubmitted,
        isPastDeadline
      };

      if (!hasSubmitted) {
        pendingAssignments.push(item);
        if (isPastDeadline) {
          overdueAssignments.push(item);
        }
      }

      return item;
    });
  }

  // 5. Fee Status
  let totalFees = 0;
  let paidFees = 0;

  try {
    const feePayments = await FeePayment.findAll({
      where: { studentId }
    });
    paidFees = feePayments.reduce((acc, p) => acc + Number(p.amountPaid || 0), 0);

    const feeStructure = await FeeStructure.findOne({
      where: { departmentId: student.departmentId }
    });
    if (feeStructure && feeStructure.amount) {
      totalFees = Number(feeStructure.amount);
    }
  } catch (err) {
    // Fee records are non-fatal
  }

  const pendingFees = Math.max(0, totalFees - paidFees);

  // 6. Recent Announcements
  let recentAnnouncements = [];
  try {
    const announcements = await Announcement.findAll({
      limit: 3,
      order: [['createdAt', 'DESC']],
      attributes: ['title', 'message', 'type', 'createdAt']
    });
    recentAnnouncements = announcements.map(a => ({
      title: a.title,
      category: a.type,
      date: new Date(a.createdAt).toLocaleDateString('en-IN')
    }));
  } catch (err) {}

  return {
    student: {
      id: student.id,
      name: student.name,
      rollNumber: student.rollNumber || 'N/A',
      instituteId: student.instituteId || 'N/A',
      department: student.department?.name || 'Engineering',
      class: student.division?.class?.name || 'Class',
      division: student.division?.name || 'A',
      semester: student.division?.class?.semesterNumber || 1
    },
    attendance: {
      overallPercentage: overallAttendancePct,
      totalSessions: totalConducted,
      attendedSessions: totalAttended,
      isLowAttendance: overallAttendancePct < 75,
      subjects: subjectAttendanceList
    },
    marks: {
      passedSubjects: passedCount,
      totalEvaluated,
      records: marksList
    },
    assignments: {
      total: assignmentsList.length,
      pendingCount: pendingAssignments.length,
      overdueCount: overdueAssignments.length,
      overdueList: overdueAssignments,
      pendingList: pendingAssignments
    },
    fees: {
      totalFees,
      paidFees,
      pendingFees,
      status: pendingFees === 0 && totalFees > 0 ? 'Fully Cleared' : pendingFees > 0 ? 'Pending' : 'Up to Date'
    },
    announcements: recentAnnouncements
  };
}

/**
 * Calls Google Gemini API with the student's authentic dossier and prompt.
 */
export async function generateGeminiParentResponse({ dossier, query, languageHint = 'auto' }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }

  // Construct structured academic dossier for Gemini
  const dossierSummary = `
STUDENT PROFILE:
- Full Name: ${dossier.student.name}
- Student ID: ${dossier.student.instituteId}
- Roll Number: ${dossier.student.rollNumber}
- Department: ${dossier.student.department}
- Class & Division: ${dossier.student.class} - Division ${dossier.student.division} (Semester ${dossier.student.semester})

ATTENDANCE RECORD:
- Overall Attendance: ${dossier.attendance.overallPercentage}% (${dossier.attendance.attendedSessions} attended out of ${dossier.attendance.totalSessions} conducted)
- Attendance Health: ${dossier.attendance.isLowAttendance ? 'ATTENDANCE ALERT (< 75% MINIMUM CRITERIA)' : 'GOOD STANDING (>= 75%)'}
- Subject Breakdown:
${dossier.attendance.subjects.length > 0 
  ? dossier.attendance.subjects.map(s => `  * ${s.name} (${s.code}): ${s.percentage}% (${s.attended}/${s.conducted} lectures) ${s.isLow ? '[LOW ATTENDANCE WARNING]' : '[OK]'}`).join('\n')
  : '  * No lecture sessions recorded yet.'}

EXAMINATION & MARKS:
- Evaluated Subjects Cleared: ${dossier.marks.passedSubjects} of ${dossier.marks.totalEvaluated}
${dossier.marks.records.length > 0
  ? dossier.marks.records.map(m => `  * ${m.subjectName} (${m.subjectCode}): Result: ${m.totalMarks}, Status: ${m.grade}`).join('\n')
  : '  * Evaluations are currently ongoing.'}

ASSIGNMENTS & SUBMISSIONS:
- Total Tasks: ${dossier.assignments.total}
- Pending Submissions: ${dossier.assignments.pendingCount}
- Overdue Tasks: ${dossier.assignments.overdueCount}
${dossier.assignments.overdueList.length > 0
  ? '  * Overdue tasks requiring immediate submission:\n' + dossier.assignments.overdueList.map(o => `    - "${o.title}" in ${o.subject} (Deadline was ${o.dueDate})`).join('\n')
  : '  * No overdue assignments.'}

FEE DUES:
- Total Course Fee: ₹${dossier.fees.totalFees}
- Amount Paid: ₹${dossier.fees.paidFees}
- Outstanding Balance: ₹${dossier.fees.pendingFees} (${dossier.fees.status})

RECENT CIRCULARS & NOTICES:
${dossier.announcements.length > 0
  ? dossier.announcements.map(a => `  * [${a.category}] ${a.title} (${a.date})`).join('\n')
  : '  * No new circulars posted.'}
`;

  const systemInstruction = `
You are the NEXUS AI Parent Counselor and Mentor at KITCOEK (Kolhapur Institute of Technology's College of Engineering).
You are speaking directly and warmly to the parent of student "${dossier.student.name}".
You have the student's authentic verified academic records.

CORE OBJECTIVES:
1. INTELLIGENT LANGUAGE DETECTION (FROM LATIN / ENGLISH SCRIPT):
   - The user's query will always arrive transcribed in Latin/English letters (speech-to-text), but the underlying words will often be Hindi or Marathi!
   - Analyze the words carefully:
     * HINDI / HINGLISH: If the words are Hindi written in Latin alphabet (e.g. "mere bete ki attendance kitni hai", "kaisa chal raha hai", "marks kitne mile", "kya wo regular college ja raha hai"), respond in fluent, respectful, natural HINDI (in Devanagari script).
     * MARATHI: If the words are Marathi written in Latin alphabet (e.g. "mazya mulachi hajeri kiti ahe", "kasa abhyas chalu ahe", "mulache gun kiti ahet"), respond in polite, warm MARATHI (in Devanagari script).
     * ENGLISH: If the words are English (e.g. "how is my child's attendance", "what are the marks"), respond in friendly, polished ENGLISH.

2. WARM, FRIENDLY & ENCOURAGING TONE (NOT ROBOTIC):
   - Parents care deeply about their children. Do NOT give cold, dry, or purely robotic stats.
   - Be empathetic, friendly, polite, and reassuring (like a supportive college advisor).
   - Address the topic the parent asked about (e.g., attendance) with full context and positive guidance:
     * Don't just spit out "33.3%". Explain what it means kindly (e.g., attended 1 out of 3 sessions), mention the 75% college requirement gently, and encourage them warmly to help the student attend regular classes.
     * Reassure the parent that the faculty and mentor team are here to help the student succeed.
   - Keep the response focused on the topic asked (don't dump unrelated fees or homework unless asked), but ensure it feels genuinely conversational and human.
`;

  const userPrompt = `
Verified Academic Dossier for ${dossier.student.name}:
- Attendance: ${dossier.attendance.overallPercentage}% (${dossier.attendance.attendedSessions} attended of ${dossier.attendance.totalSessions} sessions conducted). ${dossier.attendance.isLowAttendance ? 'Current Status: Below mandatory 75% threshold (needs regular attendance).' : 'Current Status: Healthy attendance (>= 75%).'}
- Subjects Attendance Details: ${dossier.attendance.subjects.map(s => `${s.name}: ${s.percentage}% (${s.attended}/${s.conducted})`).join(', ') || 'Classes underway'}
- Marks: Cleared ${dossier.marks.passedSubjects} of ${dossier.marks.totalEvaluated} evaluated subjects.
- Assignments: ${dossier.assignments.pendingCount} pending (${dossier.assignments.overdueCount} overdue).
- Fee Balance: ₹${dossier.fees.pendingFees} (${dossier.fees.status}).

Parent's Query (transcribed in Latin text):
"${query}"

Detect the language (Hindi/Marathi/English) and reply warmly, politely, and supportively to the parent.
`;

  // Active Gemini models
  const models = [
    'gemini-3.5-flash',
    'gemini-flash-latest'
  ];
  let lastError = null;

  for (const model of models) {
    // Try up to 2 attempts per model to gracefully handle transient 503 demand spikes
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise(r => setTimeout(r, 800));
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: userPrompt }]
              }
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 2048
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 503 && attempt === 0) {
            console.warn(`[ParentAiService] Model ${model} experienced temporary 503 spike, retrying...`);
            continue;
          }
          throw new Error(`Gemini API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const text = parts.map(p => p.text).filter(Boolean).join('\n').trim();

        if (text) {
          return text;
        }
      } catch (err) {
        console.warn(`[ParentAiService] Model ${model} attempt ${attempt + 1} failed:`, err.message);
        lastError = err;
      }
    }
  }

  // If Gemini API call fails, generate a concise topic-specific grounded fallback
  console.warn('[ParentAiService] Falling back to rule-based localized formatter due to:', lastError?.message);
  return generateGroundedFallbackResponse(dossier, query, languageHint);
}

/**
 * Generates an intelligent localized fallback when external AI network is unreachable.
 */
function generateGroundedFallbackResponse(dossier, query, lang = 'en') {
  const q = (query || '').toLowerCase();
  const isHinglish = /mere|mera|meri|bete|beti|batao|kitni|kitna|hai|kya|kaisi|kaisa|karo|bataiye|padhai/i.test(q);
  const isRomanMarathi = /mazya|majhya|mulachi|mulache|kiti|ahe|saanga|sang/i.test(q);
  const isMarathi = lang === 'mr' || isRomanMarathi || /हजेरी|गुण|अभ्यास|मुला|माहिती|तपशील|निकाल|स्वाध्याय/i.test(query);
  const isHindi = lang === 'hi' || isHinglish || /उपस्थिति|अंक|बच्चे|पढ़ाई|जानकारी|फीस|रिजल्ट/i.test(query);

  const { student, attendance, marks, assignments, fees } = dossier;

  const isAttendanceQuery = /attendance|attend|हजेरी|उपस्थिति|हाजिरी|haziri|hajeri/i.test(q);
  const isMarksQuery = /marks|result|score|exam|गुण|निकाल|अंक|परीक्ष|pariksha|parinaam/i.test(q);
  const isAssignmentQuery = /assignment|homework|task|गृहपाठ|स्वाध्याय|असाइनमेंट|submission/i.test(q);
  const isFeesQuery = /fee|fees|dues|payment|शुल्क|फी|फीस/i.test(q);

  // 1. Marathi Responses
  if (isMarathi) {
    if (isAttendanceQuery) {
      return `नमस्कार! तुमच्या पाल्याची (**${student.name}**) एकूण उपस्थिती सध्या **${attendance.overallPercentage}%** आहे (${attendance.totalSessions} पैकी ${attendance.attendedSessions} वर्ग उपस्थित). ${attendance.isLowAttendance ? '⚠️ सध्या ही हजेरी कॉलेजच्या ७५% नियमापेक्षा कमी आहे. काळजी करू नका, त्यांनी रोज नियमित वर्गाला उपस्थित राहावे यासाठी आपण त्यांना प्रोत्साहन देऊया.' : '✅ हजेरी अतिशय उत्तम आणि समाधानकारक आहे. अशीच नियमितता चालू ठेवावी!'}`;
    }
    if (isMarksQuery) {
      return `नमस्कार! **${student.name}** ने परीक्षेच्या **${marks.totalEvaluated}** पैकी **${marks.passedSubjects}** विषय यशस्वीरीत्या उत्तीर्ण केले आहेत. चालू सत्रात आणखी प्रगतीसाठी शिक्षक मार्गदर्शन करत आहेत.`;
    }
    if (isAssignmentQuery) {
      return `नमस्कार! **${student.name}** चे सध्या **${assignments.pendingCount}** स्वाध्याय बाकी आहेत${assignments.overdueCount > 0 ? `, ज्यापैकी **${assignments.overdueCount}** ची अंतिम तारीख उलटली आहे. कृपया त्यांना हे स्वाध्याय लवकर पूर्ण करण्यास सांगा.` : '. वेळेत काम पूर्ण करण्यासाठी त्यांना प्रेरित करा.'}`;
    }
    if (isFeesQuery) {
      return `कॉलेज रेकॉर्डनुसार **${student.name}** ची शिल्लक फी ₹**${fees.pendingFees}** आहे (${fees.status}). काही अडचण असल्यास कॉलेज ऑफिसशी संपर्क साधू शकता.`;
    }
    return `**${student.name}** चा संक्षिप्त अहवाल: हजेरी **${attendance.overallPercentage}%**, उत्तीर्ण विषय: **${marks.passedSubjects}/${marks.totalEvaluated}**, बाकी स्वाध्याय: **${assignments.pendingCount}**. आम्ही त्यांच्या प्रगतीसाठी नेहमी सोबत आहोत!`;
  }

  // 2. Hindi Responses (Handles Hindi & Hinglish like "mere bete ki attendance kitni hai")
  if (isHindi) {
    if (isAttendanceQuery) {
      return `नमस्ते! आपके बच्चे (**${student.name}**) की कुल उपस्थिति इस समय **${attendance.overallPercentage}%** है (${attendance.totalSessions} में से ${attendance.attendedSessions} कक्षाएं उपस्थित)। ${attendance.isLowAttendance ? '⚠️ यह 75% के अनिवार्य स्तर से थोड़ी कम है। चिंता न करें, आप उन्हें नियमित रूप से कॉलेज जाने के लिए प्रेरित करें ताकि वे इस कमी को आसानी से पूरा कर सकें।' : '✅ उपस्थिति बहुत अच्छी और संतोषजनक है। इसे इसी तरह बनाए रखने में उनका उत्साह बढ़ाएं!'}`;
    }
    if (isMarksQuery) {
      return `नमस्ते! **${student.name}** ने मूल्यांकित **${marks.totalEvaluated}** में से **${marks.passedSubjects}** विषय सफलतापूर्वक उत्तीर्ण कर लिए हैं। बाकी विषयों में बेहतर अंक लाने के लिए शिक्षक निरंतर उनका मार्गदर्शन कर रहे हैं।`;
    }
    if (isAssignmentQuery) {
      return `नमस्ते! **${student.name}** के अभी **${assignments.pendingCount}** असाइनमेंट बाकी हैं${assignments.overdueCount > 0 ? `, जिनमें से **${assignments.overdueCount}** की अंतिम तिथि निकल चुकी है। कृपया उन्हें इन्हें जल्द से जल्द जमा करने के लिए कहें।` : '। समय पर जमा करने के लिए उन्हें प्रोत्साहित करें।'}`;
    }
    if (isFeesQuery) {
      return `कॉलेज रिकॉर्ड के अनुसार **${student.name}** की बकाया फीस ₹**${fees.pendingFees}** है (${fees.status})। अधिक जानकारी या सहायता के लिए आप कॉलेज कार्यालय से संपर्क कर सकते हैं।`;
    }
    return `**${student.name}** की शैक्षणिक स्थिति: कुल उपस्थिति **${attendance.overallPercentage}%**, उत्तीर्ण विषय: **${marks.passedSubjects}/${marks.totalEvaluated}**, शेष असाइनमेंट: **${assignments.pendingCount}**। हम उनके उज्ज्वल भविष्य के लिए हमेशा तत्पर हैं!`;
  }

  // 3. English Responses
  if (isAttendanceQuery) {
    return `Hello! **${student.name}**'s overall attendance currently stands at **${attendance.overallPercentage}%** (${attendance.attendedSessions} attended of ${attendance.totalSessions} sessions). ${attendance.isLowAttendance ? '⚠️ This is currently below the mandatory 75% threshold. Encouraging them to attend regular lectures will help them comfortably bridge this gap.' : '✅ Their attendance is healthy and on track. Keep encouraging their regularity!'}`;
  }
  if (isMarksQuery) {
    return `Hello! **${student.name}** has successfully cleared **${marks.passedSubjects}** out of **${marks.totalEvaluated}** evaluated subjects so far. Mentors are actively guiding them for even better scores in ongoing coursework.`;
  }
  if (isAssignmentQuery) {
    return `Hello! **${student.name}** currently has **${assignments.pendingCount}** pending assignment(s)${assignments.overdueCount > 0 ? `, with **${assignments.overdueCount}** past the submission deadline. A gentle reminder to submit them promptly would be very helpful.` : '. They are progressing well on coursework.'}`;
  }
  if (isFeesQuery) {
    return `According to college records, the outstanding fee balance for **${student.name}** is ₹**${fees.pendingFees}** (${fees.status}). Feel free to reach out to the accounts department if you have any questions.`;
  }

  return `Academic summary for **${student.name}**: Attendance is at **${attendance.overallPercentage}%**, Passed Subjects: **${marks.passedSubjects}/${marks.totalEvaluated}**, Pending Tasks: **${assignments.pendingCount}**. We are always here to support your ward!`;
}
