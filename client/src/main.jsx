import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// =====================================================================
// React + Google Translate DOM Reconciliation Safety Patch
// Resolves: "Failed to execute 'removeChild' on 'Node'"
// Protects React reconciliation when Google Translate wraps text nodes
// =====================================================================
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (!child) return child;
    if (child.parentNode !== this) {
      if (child.parentNode) {
        try {
          return child.parentNode.removeChild(child);
        } catch (e) {
          return child;
        }
      }
      return child;
    }
    try {
      return originalRemoveChild.apply(this, arguments);
    } catch (e) {
      // Prevent React crash when external translator mutated the DOM
      if (child.parentNode) {
        try {
          return child.parentNode.removeChild(child);
        } catch (err) {}
      }
      return child;
    }
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (!newNode) return newNode;
    if (referenceNode && referenceNode.parentNode !== this) {
      if (referenceNode.parentNode) {
        try {
          return referenceNode.parentNode.insertBefore(newNode, referenceNode);
        } catch (e) {
          return newNode;
        }
      }
      try {
        return this.appendChild(newNode);
      } catch (e) {
        return newNode;
      }
    }
    try {
      return originalInsertBefore.apply(this, arguments);
    } catch (e) {
      try {
        return this.appendChild(newNode);
      } catch (err) {
        return newNode;
      }
    }
  };

  const originalReplaceChild = Node.prototype.replaceChild;
  Node.prototype.replaceChild = function (newChild, oldChild) {
    if (!newChild || !oldChild) return newChild;
    if (oldChild.parentNode !== this) {
      if (oldChild.parentNode) {
        try {
          return oldChild.parentNode.replaceChild(newChild, oldChild);
        } catch (e) {
          return newChild;
        }
      }
      try {
        return this.appendChild(newChild);
      } catch (e) {
        return newChild;
      }
    }
    try {
      return originalReplaceChild.apply(this, arguments);
    } catch (e) {
      try {
        return this.appendChild(newChild);
      } catch (err) {
        return newChild;
      }
    }
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
