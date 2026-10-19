function getDefaultExportFromCjs(x2) {
  return x2 && x2.__esModule && Object.prototype.hasOwnProperty.call(x2, "default") ? x2["default"] : x2;
}
var jsxRuntime = { exports: {} };
var reactJsxRuntime_production_min = {};
var react = { exports: {} };
var react_production_min = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var l$1 = Symbol.for("react.element"), n$1 = Symbol.for("react.portal"), p$2 = Symbol.for("react.fragment"), q$1 = Symbol.for("react.strict_mode"), r = Symbol.for("react.profiler"), t = Symbol.for("react.provider"), u = Symbol.for("react.context"), v$1 = Symbol.for("react.forward_ref"), w = Symbol.for("react.suspense"), x = Symbol.for("react.memo"), y = Symbol.for("react.lazy"), z$1 = Symbol.iterator;
function A$1(a) {
  if (null === a || "object" !== typeof a) return null;
  a = z$1 && a[z$1] || a["@@iterator"];
  return "function" === typeof a ? a : null;
}
var B$1 = { isMounted: function() {
  return false;
}, enqueueForceUpdate: function() {
}, enqueueReplaceState: function() {
}, enqueueSetState: function() {
} }, C$1 = Object.assign, D$1 = {};
function E$1(a, b, e) {
  this.props = a;
  this.context = b;
  this.refs = D$1;
  this.updater = e || B$1;
}
E$1.prototype.isReactComponent = {};
E$1.prototype.setState = function(a, b) {
  if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
  this.updater.enqueueSetState(this, a, b, "setState");
};
E$1.prototype.forceUpdate = function(a) {
  this.updater.enqueueForceUpdate(this, a, "forceUpdate");
};
function F() {
}
F.prototype = E$1.prototype;
function G$1(a, b, e) {
  this.props = a;
  this.context = b;
  this.refs = D$1;
  this.updater = e || B$1;
}
var H$1 = G$1.prototype = new F();
H$1.constructor = G$1;
C$1(H$1, E$1.prototype);
H$1.isPureReactComponent = true;
var I$1 = Array.isArray, J = Object.prototype.hasOwnProperty, K$1 = { current: null }, L$1 = { key: true, ref: true, __self: true, __source: true };
function M$1(a, b, e) {
  var d, c = {}, k2 = null, h = null;
  if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k2 = "" + b.key), b) J.call(b, d) && !L$1.hasOwnProperty(d) && (c[d] = b[d]);
  var g = arguments.length - 2;
  if (1 === g) c.children = e;
  else if (1 < g) {
    for (var f2 = Array(g), m2 = 0; m2 < g; m2++) f2[m2] = arguments[m2 + 2];
    c.children = f2;
  }
  if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
  return { $$typeof: l$1, type: a, key: k2, ref: h, props: c, _owner: K$1.current };
}
function N$1(a, b) {
  return { $$typeof: l$1, type: a.type, key: b, ref: a.ref, props: a.props, _owner: a._owner };
}
function O$1(a) {
  return "object" === typeof a && null !== a && a.$$typeof === l$1;
}
function escape(a) {
  var b = { "=": "=0", ":": "=2" };
  return "$" + a.replace(/[=:]/g, function(a2) {
    return b[a2];
  });
}
var P$1 = /\/+/g;
function Q$1(a, b) {
  return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
}
function R$1(a, b, e, d, c) {
  var k2 = typeof a;
  if ("undefined" === k2 || "boolean" === k2) a = null;
  var h = false;
  if (null === a) h = true;
  else switch (k2) {
    case "string":
    case "number":
      h = true;
      break;
    case "object":
      switch (a.$$typeof) {
        case l$1:
        case n$1:
          h = true;
      }
  }
  if (h) return h = a, c = c(h), a = "" === d ? "." + Q$1(h, 0) : d, I$1(c) ? (e = "", null != a && (e = a.replace(P$1, "$&/") + "/"), R$1(c, b, e, "", function(a2) {
    return a2;
  })) : null != c && (O$1(c) && (c = N$1(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P$1, "$&/") + "/") + a)), b.push(c)), 1;
  h = 0;
  d = "" === d ? "." : d + ":";
  if (I$1(a)) for (var g = 0; g < a.length; g++) {
    k2 = a[g];
    var f2 = d + Q$1(k2, g);
    h += R$1(k2, b, e, f2, c);
  }
  else if (f2 = A$1(a), "function" === typeof f2) for (a = f2.call(a), g = 0; !(k2 = a.next()).done; ) k2 = k2.value, f2 = d + Q$1(k2, g++), h += R$1(k2, b, e, f2, c);
  else if ("object" === k2) throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
  return h;
}
function S$1(a, b, e) {
  if (null == a) return a;
  var d = [], c = 0;
  R$1(a, d, "", "", function(a2) {
    return b.call(e, a2, c++);
  });
  return d;
}
function T$1(a) {
  if (-1 === a._status) {
    var b = a._result;
    b = b();
    b.then(function(b2) {
      if (0 === a._status || -1 === a._status) a._status = 1, a._result = b2;
    }, function(b2) {
      if (0 === a._status || -1 === a._status) a._status = 2, a._result = b2;
    });
    -1 === a._status && (a._status = 0, a._result = b);
  }
  if (1 === a._status) return a._result.default;
  throw a._result;
}
var U$1 = { current: null }, V$1 = { transition: null }, W$1 = { ReactCurrentDispatcher: U$1, ReactCurrentBatchConfig: V$1, ReactCurrentOwner: K$1 };
function X$1() {
  throw Error("act(...) is not supported in production builds of React.");
}
react_production_min.Children = { map: S$1, forEach: function(a, b, e) {
  S$1(a, function() {
    b.apply(this, arguments);
  }, e);
}, count: function(a) {
  var b = 0;
  S$1(a, function() {
    b++;
  });
  return b;
}, toArray: function(a) {
  return S$1(a, function(a2) {
    return a2;
  }) || [];
}, only: function(a) {
  if (!O$1(a)) throw Error("React.Children.only expected to receive a single React element child.");
  return a;
} };
react_production_min.Component = E$1;
react_production_min.Fragment = p$2;
react_production_min.Profiler = r;
react_production_min.PureComponent = G$1;
react_production_min.StrictMode = q$1;
react_production_min.Suspense = w;
react_production_min.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W$1;
react_production_min.act = X$1;
react_production_min.cloneElement = function(a, b, e) {
  if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
  var d = C$1({}, a.props), c = a.key, k2 = a.ref, h = a._owner;
  if (null != b) {
    void 0 !== b.ref && (k2 = b.ref, h = K$1.current);
    void 0 !== b.key && (c = "" + b.key);
    if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
    for (f2 in b) J.call(b, f2) && !L$1.hasOwnProperty(f2) && (d[f2] = void 0 === b[f2] && void 0 !== g ? g[f2] : b[f2]);
  }
  var f2 = arguments.length - 2;
  if (1 === f2) d.children = e;
  else if (1 < f2) {
    g = Array(f2);
    for (var m2 = 0; m2 < f2; m2++) g[m2] = arguments[m2 + 2];
    d.children = g;
  }
  return { $$typeof: l$1, type: a.type, key: c, ref: k2, props: d, _owner: h };
};
react_production_min.createContext = function(a) {
  a = { $$typeof: u, _currentValue: a, _currentValue2: a, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
  a.Provider = { $$typeof: t, _context: a };
  return a.Consumer = a;
};
react_production_min.createElement = M$1;
react_production_min.createFactory = function(a) {
  var b = M$1.bind(null, a);
  b.type = a;
  return b;
};
react_production_min.createRef = function() {
  return { current: null };
};
react_production_min.forwardRef = function(a) {
  return { $$typeof: v$1, render: a };
};
react_production_min.isValidElement = O$1;
react_production_min.lazy = function(a) {
  return { $$typeof: y, _payload: { _status: -1, _result: a }, _init: T$1 };
};
react_production_min.memo = function(a, b) {
  return { $$typeof: x, type: a, compare: void 0 === b ? null : b };
};
react_production_min.startTransition = function(a) {
  var b = V$1.transition;
  V$1.transition = {};
  try {
    a();
  } finally {
    V$1.transition = b;
  }
};
react_production_min.unstable_act = X$1;
react_production_min.useCallback = function(a, b) {
  return U$1.current.useCallback(a, b);
};
react_production_min.useContext = function(a) {
  return U$1.current.useContext(a);
};
react_production_min.useDebugValue = function() {
};
react_production_min.useDeferredValue = function(a) {
  return U$1.current.useDeferredValue(a);
};
react_production_min.useEffect = function(a, b) {
  return U$1.current.useEffect(a, b);
};
react_production_min.useId = function() {
  return U$1.current.useId();
};
react_production_min.useImperativeHandle = function(a, b, e) {
  return U$1.current.useImperativeHandle(a, b, e);
};
react_production_min.useInsertionEffect = function(a, b) {
  return U$1.current.useInsertionEffect(a, b);
};
react_production_min.useLayoutEffect = function(a, b) {
  return U$1.current.useLayoutEffect(a, b);
};
react_production_min.useMemo = function(a, b) {
  return U$1.current.useMemo(a, b);
};
react_production_min.useReducer = function(a, b, e) {
  return U$1.current.useReducer(a, b, e);
};
react_production_min.useRef = function(a) {
  return U$1.current.useRef(a);
};
react_production_min.useState = function(a) {
  return U$1.current.useState(a);
};
react_production_min.useSyncExternalStore = function(a, b, e) {
  return U$1.current.useSyncExternalStore(a, b, e);
};
react_production_min.useTransition = function() {
  return U$1.current.useTransition();
};
react_production_min.version = "18.3.1";
{
  react.exports = react_production_min;
}
var reactExports = react.exports;
const React = /* @__PURE__ */ getDefaultExportFromCjs(reactExports);
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var f = reactExports, k = Symbol.for("react.element"), l = Symbol.for("react.fragment"), m$1 = Object.prototype.hasOwnProperty, n = f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, p$1 = { key: true, ref: true, __self: true, __source: true };
function q(c, a, g) {
  var b, d = {}, e = null, h = null;
  void 0 !== g && (e = "" + g);
  void 0 !== a.key && (e = "" + a.key);
  void 0 !== a.ref && (h = a.ref);
  for (b in a) m$1.call(a, b) && !p$1.hasOwnProperty(b) && (d[b] = a[b]);
  if (c && c.defaultProps) for (b in a = c.defaultProps, a) void 0 === d[b] && (d[b] = a[b]);
  return { $$typeof: k, type: c, key: e, ref: h, props: d, _owner: n.current };
}
reactJsxRuntime_production_min.Fragment = l;
reactJsxRuntime_production_min.jsx = q;
reactJsxRuntime_production_min.jsxs = q;
{
  jsxRuntime.exports = reactJsxRuntime_production_min;
}
var jsxRuntimeExports = jsxRuntime.exports;
var client = {};
var reactDom = { exports: {} };
var reactDom_production_min = {};
var scheduler = { exports: {} };
var scheduler_production_min = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
(function(exports) {
  function f2(a, b) {
    var c = a.length;
    a.push(b);
    a: for (; 0 < c; ) {
      var d = c - 1 >>> 1, e = a[d];
      if (0 < g(e, b)) a[d] = b, a[c] = e, c = d;
      else break a;
    }
  }
  function h(a) {
    return 0 === a.length ? null : a[0];
  }
  function k2(a) {
    if (0 === a.length) return null;
    var b = a[0], c = a.pop();
    if (c !== b) {
      a[0] = c;
      a: for (var d = 0, e = a.length, w2 = e >>> 1; d < w2; ) {
        var m2 = 2 * (d + 1) - 1, C2 = a[m2], n2 = m2 + 1, x2 = a[n2];
        if (0 > g(C2, c)) n2 < e && 0 > g(x2, C2) ? (a[d] = x2, a[n2] = c, d = n2) : (a[d] = C2, a[m2] = c, d = m2);
        else if (n2 < e && 0 > g(x2, c)) a[d] = x2, a[n2] = c, d = n2;
        else break a;
      }
    }
    return b;
  }
  function g(a, b) {
    var c = a.sortIndex - b.sortIndex;
    return 0 !== c ? c : a.id - b.id;
  }
  if ("object" === typeof performance && "function" === typeof performance.now) {
    var l2 = performance;
    exports.unstable_now = function() {
      return l2.now();
    };
  } else {
    var p2 = Date, q2 = p2.now();
    exports.unstable_now = function() {
      return p2.now() - q2;
    };
  }
  var r2 = [], t2 = [], u2 = 1, v2 = null, y2 = 3, z2 = false, A2 = false, B2 = false, D2 = "function" === typeof setTimeout ? setTimeout : null, E2 = "function" === typeof clearTimeout ? clearTimeout : null, F2 = "undefined" !== typeof setImmediate ? setImmediate : null;
  "undefined" !== typeof navigator && void 0 !== navigator.scheduling && void 0 !== navigator.scheduling.isInputPending && navigator.scheduling.isInputPending.bind(navigator.scheduling);
  function G2(a) {
    for (var b = h(t2); null !== b; ) {
      if (null === b.callback) k2(t2);
      else if (b.startTime <= a) k2(t2), b.sortIndex = b.expirationTime, f2(r2, b);
      else break;
      b = h(t2);
    }
  }
  function H2(a) {
    B2 = false;
    G2(a);
    if (!A2) if (null !== h(r2)) A2 = true, I2(J2);
    else {
      var b = h(t2);
      null !== b && K2(H2, b.startTime - a);
    }
  }
  function J2(a, b) {
    A2 = false;
    B2 && (B2 = false, E2(L2), L2 = -1);
    z2 = true;
    var c = y2;
    try {
      G2(b);
      for (v2 = h(r2); null !== v2 && (!(v2.expirationTime > b) || a && !M2()); ) {
        var d = v2.callback;
        if ("function" === typeof d) {
          v2.callback = null;
          y2 = v2.priorityLevel;
          var e = d(v2.expirationTime <= b);
          b = exports.unstable_now();
          "function" === typeof e ? v2.callback = e : v2 === h(r2) && k2(r2);
          G2(b);
        } else k2(r2);
        v2 = h(r2);
      }
      if (null !== v2) var w2 = true;
      else {
        var m2 = h(t2);
        null !== m2 && K2(H2, m2.startTime - b);
        w2 = false;
      }
      return w2;
    } finally {
      v2 = null, y2 = c, z2 = false;
    }
  }
  var N2 = false, O2 = null, L2 = -1, P2 = 5, Q2 = -1;
  function M2() {
    return exports.unstable_now() - Q2 < P2 ? false : true;
  }
  function R2() {
    if (null !== O2) {
      var a = exports.unstable_now();
      Q2 = a;
      var b = true;
      try {
        b = O2(true, a);
      } finally {
        b ? S2() : (N2 = false, O2 = null);
      }
    } else N2 = false;
  }
  var S2;
  if ("function" === typeof F2) S2 = function() {
    F2(R2);
  };
  else if ("undefined" !== typeof MessageChannel) {
    var T2 = new MessageChannel(), U2 = T2.port2;
    T2.port1.onmessage = R2;
    S2 = function() {
      U2.postMessage(null);
    };
  } else S2 = function() {
    D2(R2, 0);
  };
  function I2(a) {
    O2 = a;
    N2 || (N2 = true, S2());
  }
  function K2(a, b) {
    L2 = D2(function() {
      a(exports.unstable_now());
    }, b);
  }
  exports.unstable_IdlePriority = 5;
  exports.unstable_ImmediatePriority = 1;
  exports.unstable_LowPriority = 4;
  exports.unstable_NormalPriority = 3;
  exports.unstable_Profiling = null;
  exports.unstable_UserBlockingPriority = 2;
  exports.unstable_cancelCallback = function(a) {
    a.callback = null;
  };
  exports.unstable_continueExecution = function() {
    A2 || z2 || (A2 = true, I2(J2));
  };
  exports.unstable_forceFrameRate = function(a) {
    0 > a || 125 < a ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : P2 = 0 < a ? Math.floor(1e3 / a) : 5;
  };
  exports.unstable_getCurrentPriorityLevel = function() {
    return y2;
  };
  exports.unstable_getFirstCallbackNode = function() {
    return h(r2);
  };
  exports.unstable_next = function(a) {
    switch (y2) {
      case 1:
      case 2:
      case 3:
        var b = 3;
        break;
      default:
        b = y2;
    }
    var c = y2;
    y2 = b;
    try {
      return a();
    } finally {
      y2 = c;
    }
  };
  exports.unstable_pauseExecution = function() {
  };
  exports.unstable_requestPaint = function() {
  };
  exports.unstable_runWithPriority = function(a, b) {
    switch (a) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
        break;
      default:
        a = 3;
    }
    var c = y2;
    y2 = a;
    try {
      return b();
    } finally {
      y2 = c;
    }
  };
  exports.unstable_scheduleCallback = function(a, b, c) {
    var d = exports.unstable_now();
    "object" === typeof c && null !== c ? (c = c.delay, c = "number" === typeof c && 0 < c ? d + c : d) : c = d;
    switch (a) {
      case 1:
        var e = -1;
        break;
      case 2:
        e = 250;
        break;
      case 5:
        e = 1073741823;
        break;
      case 4:
        e = 1e4;
        break;
      default:
        e = 5e3;
    }
    e = c + e;
    a = { id: u2++, callback: b, priorityLevel: a, startTime: c, expirationTime: e, sortIndex: -1 };
    c > d ? (a.sortIndex = c, f2(t2, a), null === h(r2) && a === h(t2) && (B2 ? (E2(L2), L2 = -1) : B2 = true, K2(H2, c - d))) : (a.sortIndex = e, f2(r2, a), A2 || z2 || (A2 = true, I2(J2)));
    return a;
  };
  exports.unstable_shouldYield = M2;
  exports.unstable_wrapCallback = function(a) {
    var b = y2;
    return function() {
      var c = y2;
      y2 = b;
      try {
        return a.apply(this, arguments);
      } finally {
        y2 = c;
      }
    };
  };
})(scheduler_production_min);
{
  scheduler.exports = scheduler_production_min;
}
var schedulerExports = scheduler.exports;
/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var aa = reactExports, ca = schedulerExports;
function p(a) {
  for (var b = "https://reactjs.org/docs/error-decoder.html?invariant=" + a, c = 1; c < arguments.length; c++) b += "&args[]=" + encodeURIComponent(arguments[c]);
  return "Minified React error #" + a + "; visit " + b + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
}
var da = /* @__PURE__ */ new Set(), ea = {};
function fa(a, b) {
  ha(a, b);
  ha(a + "Capture", b);
}
function ha(a, b) {
  ea[a] = b;
  for (a = 0; a < b.length; a++) da.add(b[a]);
}
var ia = !("undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement), ja = Object.prototype.hasOwnProperty, ka = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, la = {}, ma = {};
function oa(a) {
  if (ja.call(ma, a)) return true;
  if (ja.call(la, a)) return false;
  if (ka.test(a)) return ma[a] = true;
  la[a] = true;
  return false;
}
function pa(a, b, c, d) {
  if (null !== c && 0 === c.type) return false;
  switch (typeof b) {
    case "function":
    case "symbol":
      return true;
    case "boolean":
      if (d) return false;
      if (null !== c) return !c.acceptsBooleans;
      a = a.toLowerCase().slice(0, 5);
      return "data-" !== a && "aria-" !== a;
    default:
      return false;
  }
}
function qa(a, b, c, d) {
  if (null === b || "undefined" === typeof b || pa(a, b, c, d)) return true;
  if (d) return false;
  if (null !== c) switch (c.type) {
    case 3:
      return !b;
    case 4:
      return false === b;
    case 5:
      return isNaN(b);
    case 6:
      return isNaN(b) || 1 > b;
  }
  return false;
}
function v(a, b, c, d, e, f2, g) {
  this.acceptsBooleans = 2 === b || 3 === b || 4 === b;
  this.attributeName = d;
  this.attributeNamespace = e;
  this.mustUseProperty = c;
  this.propertyName = a;
  this.type = b;
  this.sanitizeURL = f2;
  this.removeEmptyString = g;
}
var z = {};
"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(a) {
  z[a] = new v(a, 0, false, a, null, false, false);
});
[["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(a) {
  var b = a[0];
  z[b] = new v(b, 1, false, a[1], null, false, false);
});
["contentEditable", "draggable", "spellCheck", "value"].forEach(function(a) {
  z[a] = new v(a, 2, false, a.toLowerCase(), null, false, false);
});
["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(a) {
  z[a] = new v(a, 2, false, a, null, false, false);
});
"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(a) {
  z[a] = new v(a, 3, false, a.toLowerCase(), null, false, false);
});
["checked", "multiple", "muted", "selected"].forEach(function(a) {
  z[a] = new v(a, 3, true, a, null, false, false);
});
["capture", "download"].forEach(function(a) {
  z[a] = new v(a, 4, false, a, null, false, false);
});
["cols", "rows", "size", "span"].forEach(function(a) {
  z[a] = new v(a, 6, false, a, null, false, false);
});
["rowSpan", "start"].forEach(function(a) {
  z[a] = new v(a, 5, false, a.toLowerCase(), null, false, false);
});
var ra = /[\-:]([a-z])/g;
function sa(a) {
  return a[1].toUpperCase();
}
"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(a) {
  var b = a.replace(
    ra,
    sa
  );
  z[b] = new v(b, 1, false, a, null, false, false);
});
"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(a) {
  var b = a.replace(ra, sa);
  z[b] = new v(b, 1, false, a, "http://www.w3.org/1999/xlink", false, false);
});
["xml:base", "xml:lang", "xml:space"].forEach(function(a) {
  var b = a.replace(ra, sa);
  z[b] = new v(b, 1, false, a, "http://www.w3.org/XML/1998/namespace", false, false);
});
["tabIndex", "crossOrigin"].forEach(function(a) {
  z[a] = new v(a, 1, false, a.toLowerCase(), null, false, false);
});
z.xlinkHref = new v("xlinkHref", 1, false, "xlink:href", "http://www.w3.org/1999/xlink", true, false);
["src", "href", "action", "formAction"].forEach(function(a) {
  z[a] = new v(a, 1, false, a.toLowerCase(), null, true, true);
});
function ta(a, b, c, d) {
  var e = z.hasOwnProperty(b) ? z[b] : null;
  if (null !== e ? 0 !== e.type : d || !(2 < b.length) || "o" !== b[0] && "O" !== b[0] || "n" !== b[1] && "N" !== b[1]) qa(b, c, e, d) && (c = null), d || null === e ? oa(b) && (null === c ? a.removeAttribute(b) : a.setAttribute(b, "" + c)) : e.mustUseProperty ? a[e.propertyName] = null === c ? 3 === e.type ? false : "" : c : (b = e.attributeName, d = e.attributeNamespace, null === c ? a.removeAttribute(b) : (e = e.type, c = 3 === e || 4 === e && true === c ? "" : "" + c, d ? a.setAttributeNS(d, b, c) : a.setAttribute(b, c)));
}
var ua = aa.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, va = Symbol.for("react.element"), wa = Symbol.for("react.portal"), ya = Symbol.for("react.fragment"), za = Symbol.for("react.strict_mode"), Aa = Symbol.for("react.profiler"), Ba = Symbol.for("react.provider"), Ca = Symbol.for("react.context"), Da = Symbol.for("react.forward_ref"), Ea = Symbol.for("react.suspense"), Fa = Symbol.for("react.suspense_list"), Ga = Symbol.for("react.memo"), Ha = Symbol.for("react.lazy");
var Ia = Symbol.for("react.offscreen");
var Ja = Symbol.iterator;
function Ka(a) {
  if (null === a || "object" !== typeof a) return null;
  a = Ja && a[Ja] || a["@@iterator"];
  return "function" === typeof a ? a : null;
}
var A = Object.assign, La;
function Ma(a) {
  if (void 0 === La) try {
    throw Error();
  } catch (c) {
    var b = c.stack.trim().match(/\n( *(at )?)/);
    La = b && b[1] || "";
  }
  return "\n" + La + a;
}
var Na = false;
function Oa(a, b) {
  if (!a || Na) return "";
  Na = true;
  var c = Error.prepareStackTrace;
  Error.prepareStackTrace = void 0;
  try {
    if (b) if (b = function() {
      throw Error();
    }, Object.defineProperty(b.prototype, "props", { set: function() {
      throw Error();
    } }), "object" === typeof Reflect && Reflect.construct) {
      try {
        Reflect.construct(b, []);
      } catch (l2) {
        var d = l2;
      }
      Reflect.construct(a, [], b);
    } else {
      try {
        b.call();
      } catch (l2) {
        d = l2;
      }
      a.call(b.prototype);
    }
    else {
      try {
        throw Error();
      } catch (l2) {
        d = l2;
      }
      a();
    }
  } catch (l2) {
    if (l2 && d && "string" === typeof l2.stack) {
      for (var e = l2.stack.split("\n"), f2 = d.stack.split("\n"), g = e.length - 1, h = f2.length - 1; 1 <= g && 0 <= h && e[g] !== f2[h]; ) h--;
      for (; 1 <= g && 0 <= h; g--, h--) if (e[g] !== f2[h]) {
        if (1 !== g || 1 !== h) {
          do
            if (g--, h--, 0 > h || e[g] !== f2[h]) {
              var k2 = "\n" + e[g].replace(" at new ", " at ");
              a.displayName && k2.includes("<anonymous>") && (k2 = k2.replace("<anonymous>", a.displayName));
              return k2;
            }
          while (1 <= g && 0 <= h);
        }
        break;
      }
    }
  } finally {
    Na = false, Error.prepareStackTrace = c;
  }
  return (a = a ? a.displayName || a.name : "") ? Ma(a) : "";
}
function Pa(a) {
  switch (a.tag) {
    case 5:
      return Ma(a.type);
    case 16:
      return Ma("Lazy");
    case 13:
      return Ma("Suspense");
    case 19:
      return Ma("SuspenseList");
    case 0:
    case 2:
    case 15:
      return a = Oa(a.type, false), a;
    case 11:
      return a = Oa(a.type.render, false), a;
    case 1:
      return a = Oa(a.type, true), a;
    default:
      return "";
  }
}
function Qa(a) {
  if (null == a) return null;
  if ("function" === typeof a) return a.displayName || a.name || null;
  if ("string" === typeof a) return a;
  switch (a) {
    case ya:
      return "Fragment";
    case wa:
      return "Portal";
    case Aa:
      return "Profiler";
    case za:
      return "StrictMode";
    case Ea:
      return "Suspense";
    case Fa:
      return "SuspenseList";
  }
  if ("object" === typeof a) switch (a.$$typeof) {
    case Ca:
      return (a.displayName || "Context") + ".Consumer";
    case Ba:
      return (a._context.displayName || "Context") + ".Provider";
    case Da:
      var b = a.render;
      a = a.displayName;
      a || (a = b.displayName || b.name || "", a = "" !== a ? "ForwardRef(" + a + ")" : "ForwardRef");
      return a;
    case Ga:
      return b = a.displayName || null, null !== b ? b : Qa(a.type) || "Memo";
    case Ha:
      b = a._payload;
      a = a._init;
      try {
        return Qa(a(b));
      } catch (c) {
      }
  }
  return null;
}
function Ra(a) {
  var b = a.type;
  switch (a.tag) {
    case 24:
      return "Cache";
    case 9:
      return (b.displayName || "Context") + ".Consumer";
    case 10:
      return (b._context.displayName || "Context") + ".Provider";
    case 18:
      return "DehydratedFragment";
    case 11:
      return a = b.render, a = a.displayName || a.name || "", b.displayName || ("" !== a ? "ForwardRef(" + a + ")" : "ForwardRef");
    case 7:
      return "Fragment";
    case 5:
      return b;
    case 4:
      return "Portal";
    case 3:
      return "Root";
    case 6:
      return "Text";
    case 16:
      return Qa(b);
    case 8:
      return b === za ? "StrictMode" : "Mode";
    case 22:
      return "Offscreen";
    case 12:
      return "Profiler";
    case 21:
      return "Scope";
    case 13:
      return "Suspense";
    case 19:
      return "SuspenseList";
    case 25:
      return "TracingMarker";
    case 1:
    case 0:
    case 17:
    case 2:
    case 14:
    case 15:
      if ("function" === typeof b) return b.displayName || b.name || null;
      if ("string" === typeof b) return b;
  }
  return null;
}
function Sa(a) {
  switch (typeof a) {
    case "boolean":
    case "number":
    case "string":
    case "undefined":
      return a;
    case "object":
      return a;
    default:
      return "";
  }
}
function Ta(a) {
  var b = a.type;
  return (a = a.nodeName) && "input" === a.toLowerCase() && ("checkbox" === b || "radio" === b);
}
function Ua(a) {
  var b = Ta(a) ? "checked" : "value", c = Object.getOwnPropertyDescriptor(a.constructor.prototype, b), d = "" + a[b];
  if (!a.hasOwnProperty(b) && "undefined" !== typeof c && "function" === typeof c.get && "function" === typeof c.set) {
    var e = c.get, f2 = c.set;
    Object.defineProperty(a, b, { configurable: true, get: function() {
      return e.call(this);
    }, set: function(a2) {
      d = "" + a2;
      f2.call(this, a2);
    } });
    Object.defineProperty(a, b, { enumerable: c.enumerable });
    return { getValue: function() {
      return d;
    }, setValue: function(a2) {
      d = "" + a2;
    }, stopTracking: function() {
      a._valueTracker = null;
      delete a[b];
    } };
  }
}
function Va(a) {
  a._valueTracker || (a._valueTracker = Ua(a));
}
function Wa(a) {
  if (!a) return false;
  var b = a._valueTracker;
  if (!b) return true;
  var c = b.getValue();
  var d = "";
  a && (d = Ta(a) ? a.checked ? "true" : "false" : a.value);
  a = d;
  return a !== c ? (b.setValue(a), true) : false;
}
function Xa(a) {
  a = a || ("undefined" !== typeof document ? document : void 0);
  if ("undefined" === typeof a) return null;
  try {
    return a.activeElement || a.body;
  } catch (b) {
    return a.body;
  }
}
function Ya(a, b) {
  var c = b.checked;
  return A({}, b, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: null != c ? c : a._wrapperState.initialChecked });
}
function Za(a, b) {
  var c = null == b.defaultValue ? "" : b.defaultValue, d = null != b.checked ? b.checked : b.defaultChecked;
  c = Sa(null != b.value ? b.value : c);
  a._wrapperState = { initialChecked: d, initialValue: c, controlled: "checkbox" === b.type || "radio" === b.type ? null != b.checked : null != b.value };
}
function ab(a, b) {
  b = b.checked;
  null != b && ta(a, "checked", b, false);
}
function bb(a, b) {
  ab(a, b);
  var c = Sa(b.value), d = b.type;
  if (null != c) if ("number" === d) {
    if (0 === c && "" === a.value || a.value != c) a.value = "" + c;
  } else a.value !== "" + c && (a.value = "" + c);
  else if ("submit" === d || "reset" === d) {
    a.removeAttribute("value");
    return;
  }
  b.hasOwnProperty("value") ? cb(a, b.type, c) : b.hasOwnProperty("defaultValue") && cb(a, b.type, Sa(b.defaultValue));
  null == b.checked && null != b.defaultChecked && (a.defaultChecked = !!b.defaultChecked);
}
function db(a, b, c) {
  if (b.hasOwnProperty("value") || b.hasOwnProperty("defaultValue")) {
    var d = b.type;
    if (!("submit" !== d && "reset" !== d || void 0 !== b.value && null !== b.value)) return;
    b = "" + a._wrapperState.initialValue;
    c || b === a.value || (a.value = b);
    a.defaultValue = b;
  }
  c = a.name;
  "" !== c && (a.name = "");
  a.defaultChecked = !!a._wrapperState.initialChecked;
  "" !== c && (a.name = c);
}
function cb(a, b, c) {
  if ("number" !== b || Xa(a.ownerDocument) !== a) null == c ? a.defaultValue = "" + a._wrapperState.initialValue : a.defaultValue !== "" + c && (a.defaultValue = "" + c);
}
var eb = Array.isArray;
function fb(a, b, c, d) {
  a = a.options;
  if (b) {
    b = {};
    for (var e = 0; e < c.length; e++) b["$" + c[e]] = true;
    for (c = 0; c < a.length; c++) e = b.hasOwnProperty("$" + a[c].value), a[c].selected !== e && (a[c].selected = e), e && d && (a[c].defaultSelected = true);
  } else {
    c = "" + Sa(c);
    b = null;
    for (e = 0; e < a.length; e++) {
      if (a[e].value === c) {
        a[e].selected = true;
        d && (a[e].defaultSelected = true);
        return;
      }
      null !== b || a[e].disabled || (b = a[e]);
    }
    null !== b && (b.selected = true);
  }
}
function gb(a, b) {
  if (null != b.dangerouslySetInnerHTML) throw Error(p(91));
  return A({}, b, { value: void 0, defaultValue: void 0, children: "" + a._wrapperState.initialValue });
}
function hb(a, b) {
  var c = b.value;
  if (null == c) {
    c = b.children;
    b = b.defaultValue;
    if (null != c) {
      if (null != b) throw Error(p(92));
      if (eb(c)) {
        if (1 < c.length) throw Error(p(93));
        c = c[0];
      }
      b = c;
    }
    null == b && (b = "");
    c = b;
  }
  a._wrapperState = { initialValue: Sa(c) };
}
function ib(a, b) {
  var c = Sa(b.value), d = Sa(b.defaultValue);
  null != c && (c = "" + c, c !== a.value && (a.value = c), null == b.defaultValue && a.defaultValue !== c && (a.defaultValue = c));
  null != d && (a.defaultValue = "" + d);
}
function jb(a) {
  var b = a.textContent;
  b === a._wrapperState.initialValue && "" !== b && null !== b && (a.value = b);
}
function kb(a) {
  switch (a) {
    case "svg":
      return "http://www.w3.org/2000/svg";
    case "math":
      return "http://www.w3.org/1998/Math/MathML";
    default:
      return "http://www.w3.org/1999/xhtml";
  }
}
function lb(a, b) {
  return null == a || "http://www.w3.org/1999/xhtml" === a ? kb(b) : "http://www.w3.org/2000/svg" === a && "foreignObject" === b ? "http://www.w3.org/1999/xhtml" : a;
}
var mb, nb = function(a) {
  return "undefined" !== typeof MSApp && MSApp.execUnsafeLocalFunction ? function(b, c, d, e) {
    MSApp.execUnsafeLocalFunction(function() {
      return a(b, c, d, e);
    });
  } : a;
}(function(a, b) {
  if ("http://www.w3.org/2000/svg" !== a.namespaceURI || "innerHTML" in a) a.innerHTML = b;
  else {
    mb = mb || document.createElement("div");
    mb.innerHTML = "<svg>" + b.valueOf().toString() + "</svg>";
    for (b = mb.firstChild; a.firstChild; ) a.removeChild(a.firstChild);
    for (; b.firstChild; ) a.appendChild(b.firstChild);
  }
});
function ob(a, b) {
  if (b) {
    var c = a.firstChild;
    if (c && c === a.lastChild && 3 === c.nodeType) {
      c.nodeValue = b;
      return;
    }
  }
  a.textContent = b;
}
var pb = {
  animationIterationCount: true,
  aspectRatio: true,
  borderImageOutset: true,
  borderImageSlice: true,
  borderImageWidth: true,
  boxFlex: true,
  boxFlexGroup: true,
  boxOrdinalGroup: true,
  columnCount: true,
  columns: true,
  flex: true,
  flexGrow: true,
  flexPositive: true,
  flexShrink: true,
  flexNegative: true,
  flexOrder: true,
  gridArea: true,
  gridRow: true,
  gridRowEnd: true,
  gridRowSpan: true,
  gridRowStart: true,
  gridColumn: true,
  gridColumnEnd: true,
  gridColumnSpan: true,
  gridColumnStart: true,
  fontWeight: true,
  lineClamp: true,
  lineHeight: true,
  opacity: true,
  order: true,
  orphans: true,
  tabSize: true,
  widows: true,
  zIndex: true,
  zoom: true,
  fillOpacity: true,
  floodOpacity: true,
  stopOpacity: true,
  strokeDasharray: true,
  strokeDashoffset: true,
  strokeMiterlimit: true,
  strokeOpacity: true,
  strokeWidth: true
}, qb = ["Webkit", "ms", "Moz", "O"];
Object.keys(pb).forEach(function(a) {
  qb.forEach(function(b) {
    b = b + a.charAt(0).toUpperCase() + a.substring(1);
    pb[b] = pb[a];
  });
});
function rb(a, b, c) {
  return null == b || "boolean" === typeof b || "" === b ? "" : c || "number" !== typeof b || 0 === b || pb.hasOwnProperty(a) && pb[a] ? ("" + b).trim() : b + "px";
}
function sb(a, b) {
  a = a.style;
  for (var c in b) if (b.hasOwnProperty(c)) {
    var d = 0 === c.indexOf("--"), e = rb(c, b[c], d);
    "float" === c && (c = "cssFloat");
    d ? a.setProperty(c, e) : a[c] = e;
  }
}
var tb = A({ menuitem: true }, { area: true, base: true, br: true, col: true, embed: true, hr: true, img: true, input: true, keygen: true, link: true, meta: true, param: true, source: true, track: true, wbr: true });
function ub(a, b) {
  if (b) {
    if (tb[a] && (null != b.children || null != b.dangerouslySetInnerHTML)) throw Error(p(137, a));
    if (null != b.dangerouslySetInnerHTML) {
      if (null != b.children) throw Error(p(60));
      if ("object" !== typeof b.dangerouslySetInnerHTML || !("__html" in b.dangerouslySetInnerHTML)) throw Error(p(61));
    }
    if (null != b.style && "object" !== typeof b.style) throw Error(p(62));
  }
}
function vb(a, b) {
  if (-1 === a.indexOf("-")) return "string" === typeof b.is;
  switch (a) {
    case "annotation-xml":
    case "color-profile":
    case "font-face":
    case "font-face-src":
    case "font-face-uri":
    case "font-face-format":
    case "font-face-name":
    case "missing-glyph":
      return false;
    default:
      return true;
  }
}
var wb = null;
function xb(a) {
  a = a.target || a.srcElement || window;
  a.correspondingUseElement && (a = a.correspondingUseElement);
  return 3 === a.nodeType ? a.parentNode : a;
}
var yb = null, zb = null, Ab = null;
function Bb(a) {
  if (a = Cb(a)) {
    if ("function" !== typeof yb) throw Error(p(280));
    var b = a.stateNode;
    b && (b = Db(b), yb(a.stateNode, a.type, b));
  }
}
function Eb(a) {
  zb ? Ab ? Ab.push(a) : Ab = [a] : zb = a;
}
function Fb() {
  if (zb) {
    var a = zb, b = Ab;
    Ab = zb = null;
    Bb(a);
    if (b) for (a = 0; a < b.length; a++) Bb(b[a]);
  }
}
function Gb(a, b) {
  return a(b);
}
function Hb() {
}
var Ib = false;
function Jb(a, b, c) {
  if (Ib) return a(b, c);
  Ib = true;
  try {
    return Gb(a, b, c);
  } finally {
    if (Ib = false, null !== zb || null !== Ab) Hb(), Fb();
  }
}
function Kb(a, b) {
  var c = a.stateNode;
  if (null === c) return null;
  var d = Db(c);
  if (null === d) return null;
  c = d[b];
  a: switch (b) {
    case "onClick":
    case "onClickCapture":
    case "onDoubleClick":
    case "onDoubleClickCapture":
    case "onMouseDown":
    case "onMouseDownCapture":
    case "onMouseMove":
    case "onMouseMoveCapture":
    case "onMouseUp":
    case "onMouseUpCapture":
    case "onMouseEnter":
      (d = !d.disabled) || (a = a.type, d = !("button" === a || "input" === a || "select" === a || "textarea" === a));
      a = !d;
      break a;
    default:
      a = false;
  }
  if (a) return null;
  if (c && "function" !== typeof c) throw Error(p(231, b, typeof c));
  return c;
}
var Lb = false;
if (ia) try {
  var Mb = {};
  Object.defineProperty(Mb, "passive", { get: function() {
    Lb = true;
  } });
  window.addEventListener("test", Mb, Mb);
  window.removeEventListener("test", Mb, Mb);
} catch (a) {
  Lb = false;
}
function Nb(a, b, c, d, e, f2, g, h, k2) {
  var l2 = Array.prototype.slice.call(arguments, 3);
  try {
    b.apply(c, l2);
  } catch (m2) {
    this.onError(m2);
  }
}
var Ob = false, Pb = null, Qb = false, Rb = null, Sb = { onError: function(a) {
  Ob = true;
  Pb = a;
} };
function Tb(a, b, c, d, e, f2, g, h, k2) {
  Ob = false;
  Pb = null;
  Nb.apply(Sb, arguments);
}
function Ub(a, b, c, d, e, f2, g, h, k2) {
  Tb.apply(this, arguments);
  if (Ob) {
    if (Ob) {
      var l2 = Pb;
      Ob = false;
      Pb = null;
    } else throw Error(p(198));
    Qb || (Qb = true, Rb = l2);
  }
}
function Vb(a) {
  var b = a, c = a;
  if (a.alternate) for (; b.return; ) b = b.return;
  else {
    a = b;
    do
      b = a, 0 !== (b.flags & 4098) && (c = b.return), a = b.return;
    while (a);
  }
  return 3 === b.tag ? c : null;
}
function Wb(a) {
  if (13 === a.tag) {
    var b = a.memoizedState;
    null === b && (a = a.alternate, null !== a && (b = a.memoizedState));
    if (null !== b) return b.dehydrated;
  }
  return null;
}
function Xb(a) {
  if (Vb(a) !== a) throw Error(p(188));
}
function Yb(a) {
  var b = a.alternate;
  if (!b) {
    b = Vb(a);
    if (null === b) throw Error(p(188));
    return b !== a ? null : a;
  }
  for (var c = a, d = b; ; ) {
    var e = c.return;
    if (null === e) break;
    var f2 = e.alternate;
    if (null === f2) {
      d = e.return;
      if (null !== d) {
        c = d;
        continue;
      }
      break;
    }
    if (e.child === f2.child) {
      for (f2 = e.child; f2; ) {
        if (f2 === c) return Xb(e), a;
        if (f2 === d) return Xb(e), b;
        f2 = f2.sibling;
      }
      throw Error(p(188));
    }
    if (c.return !== d.return) c = e, d = f2;
    else {
      for (var g = false, h = e.child; h; ) {
        if (h === c) {
          g = true;
          c = e;
          d = f2;
          break;
        }
        if (h === d) {
          g = true;
          d = e;
          c = f2;
          break;
        }
        h = h.sibling;
      }
      if (!g) {
        for (h = f2.child; h; ) {
          if (h === c) {
            g = true;
            c = f2;
            d = e;
            break;
          }
          if (h === d) {
            g = true;
            d = f2;
            c = e;
            break;
          }
          h = h.sibling;
        }
        if (!g) throw Error(p(189));
      }
    }
    if (c.alternate !== d) throw Error(p(190));
  }
  if (3 !== c.tag) throw Error(p(188));
  return c.stateNode.current === c ? a : b;
}
function Zb(a) {
  a = Yb(a);
  return null !== a ? $b(a) : null;
}
function $b(a) {
  if (5 === a.tag || 6 === a.tag) return a;
  for (a = a.child; null !== a; ) {
    var b = $b(a);
    if (null !== b) return b;
    a = a.sibling;
  }
  return null;
}
var ac = ca.unstable_scheduleCallback, bc = ca.unstable_cancelCallback, cc = ca.unstable_shouldYield, dc = ca.unstable_requestPaint, B = ca.unstable_now, ec = ca.unstable_getCurrentPriorityLevel, fc = ca.unstable_ImmediatePriority, gc = ca.unstable_UserBlockingPriority, hc = ca.unstable_NormalPriority, ic = ca.unstable_LowPriority, jc = ca.unstable_IdlePriority, kc = null, lc = null;
function mc(a) {
  if (lc && "function" === typeof lc.onCommitFiberRoot) try {
    lc.onCommitFiberRoot(kc, a, void 0, 128 === (a.current.flags & 128));
  } catch (b) {
  }
}
var oc = Math.clz32 ? Math.clz32 : nc, pc = Math.log, qc = Math.LN2;
function nc(a) {
  a >>>= 0;
  return 0 === a ? 32 : 31 - (pc(a) / qc | 0) | 0;
}
var rc = 64, sc = 4194304;
function tc(a) {
  switch (a & -a) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 4:
      return 4;
    case 8:
      return 8;
    case 16:
      return 16;
    case 32:
      return 32;
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return a & 4194240;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return a & 130023424;
    case 134217728:
      return 134217728;
    case 268435456:
      return 268435456;
    case 536870912:
      return 536870912;
    case 1073741824:
      return 1073741824;
    default:
      return a;
  }
}
function uc(a, b) {
  var c = a.pendingLanes;
  if (0 === c) return 0;
  var d = 0, e = a.suspendedLanes, f2 = a.pingedLanes, g = c & 268435455;
  if (0 !== g) {
    var h = g & ~e;
    0 !== h ? d = tc(h) : (f2 &= g, 0 !== f2 && (d = tc(f2)));
  } else g = c & ~e, 0 !== g ? d = tc(g) : 0 !== f2 && (d = tc(f2));
  if (0 === d) return 0;
  if (0 !== b && b !== d && 0 === (b & e) && (e = d & -d, f2 = b & -b, e >= f2 || 16 === e && 0 !== (f2 & 4194240))) return b;
  0 !== (d & 4) && (d |= c & 16);
  b = a.entangledLanes;
  if (0 !== b) for (a = a.entanglements, b &= d; 0 < b; ) c = 31 - oc(b), e = 1 << c, d |= a[c], b &= ~e;
  return d;
}
function vc(a, b) {
  switch (a) {
    case 1:
    case 2:
    case 4:
      return b + 250;
    case 8:
    case 16:
    case 32:
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return b + 5e3;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return -1;
    case 134217728:
    case 268435456:
    case 536870912:
    case 1073741824:
      return -1;
    default:
      return -1;
  }
}
function wc(a, b) {
  for (var c = a.suspendedLanes, d = a.pingedLanes, e = a.expirationTimes, f2 = a.pendingLanes; 0 < f2; ) {
    var g = 31 - oc(f2), h = 1 << g, k2 = e[g];
    if (-1 === k2) {
      if (0 === (h & c) || 0 !== (h & d)) e[g] = vc(h, b);
    } else k2 <= b && (a.expiredLanes |= h);
    f2 &= ~h;
  }
}
function xc(a) {
  a = a.pendingLanes & -1073741825;
  return 0 !== a ? a : a & 1073741824 ? 1073741824 : 0;
}
function yc() {
  var a = rc;
  rc <<= 1;
  0 === (rc & 4194240) && (rc = 64);
  return a;
}
function zc(a) {
  for (var b = [], c = 0; 31 > c; c++) b.push(a);
  return b;
}
function Ac(a, b, c) {
  a.pendingLanes |= b;
  536870912 !== b && (a.suspendedLanes = 0, a.pingedLanes = 0);
  a = a.eventTimes;
  b = 31 - oc(b);
  a[b] = c;
}
function Bc(a, b) {
  var c = a.pendingLanes & ~b;
  a.pendingLanes = b;
  a.suspendedLanes = 0;
  a.pingedLanes = 0;
  a.expiredLanes &= b;
  a.mutableReadLanes &= b;
  a.entangledLanes &= b;
  b = a.entanglements;
  var d = a.eventTimes;
  for (a = a.expirationTimes; 0 < c; ) {
    var e = 31 - oc(c), f2 = 1 << e;
    b[e] = 0;
    d[e] = -1;
    a[e] = -1;
    c &= ~f2;
  }
}
function Cc(a, b) {
  var c = a.entangledLanes |= b;
  for (a = a.entanglements; c; ) {
    var d = 31 - oc(c), e = 1 << d;
    e & b | a[d] & b && (a[d] |= b);
    c &= ~e;
  }
}
var C = 0;
function Dc(a) {
  a &= -a;
  return 1 < a ? 4 < a ? 0 !== (a & 268435455) ? 16 : 536870912 : 4 : 1;
}
var Ec, Fc, Gc, Hc, Ic, Jc = false, Kc = [], Lc = null, Mc = null, Nc = null, Oc = /* @__PURE__ */ new Map(), Pc = /* @__PURE__ */ new Map(), Qc = [], Rc = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
function Sc(a, b) {
  switch (a) {
    case "focusin":
    case "focusout":
      Lc = null;
      break;
    case "dragenter":
    case "dragleave":
      Mc = null;
      break;
    case "mouseover":
    case "mouseout":
      Nc = null;
      break;
    case "pointerover":
    case "pointerout":
      Oc.delete(b.pointerId);
      break;
    case "gotpointercapture":
    case "lostpointercapture":
      Pc.delete(b.pointerId);
  }
}
function Tc(a, b, c, d, e, f2) {
  if (null === a || a.nativeEvent !== f2) return a = { blockedOn: b, domEventName: c, eventSystemFlags: d, nativeEvent: f2, targetContainers: [e] }, null !== b && (b = Cb(b), null !== b && Fc(b)), a;
  a.eventSystemFlags |= d;
  b = a.targetContainers;
  null !== e && -1 === b.indexOf(e) && b.push(e);
  return a;
}
function Uc(a, b, c, d, e) {
  switch (b) {
    case "focusin":
      return Lc = Tc(Lc, a, b, c, d, e), true;
    case "dragenter":
      return Mc = Tc(Mc, a, b, c, d, e), true;
    case "mouseover":
      return Nc = Tc(Nc, a, b, c, d, e), true;
    case "pointerover":
      var f2 = e.pointerId;
      Oc.set(f2, Tc(Oc.get(f2) || null, a, b, c, d, e));
      return true;
    case "gotpointercapture":
      return f2 = e.pointerId, Pc.set(f2, Tc(Pc.get(f2) || null, a, b, c, d, e)), true;
  }
  return false;
}
function Vc(a) {
  var b = Wc(a.target);
  if (null !== b) {
    var c = Vb(b);
    if (null !== c) {
      if (b = c.tag, 13 === b) {
        if (b = Wb(c), null !== b) {
          a.blockedOn = b;
          Ic(a.priority, function() {
            Gc(c);
          });
          return;
        }
      } else if (3 === b && c.stateNode.current.memoizedState.isDehydrated) {
        a.blockedOn = 3 === c.tag ? c.stateNode.containerInfo : null;
        return;
      }
    }
  }
  a.blockedOn = null;
}
function Xc(a) {
  if (null !== a.blockedOn) return false;
  for (var b = a.targetContainers; 0 < b.length; ) {
    var c = Yc(a.domEventName, a.eventSystemFlags, b[0], a.nativeEvent);
    if (null === c) {
      c = a.nativeEvent;
      var d = new c.constructor(c.type, c);
      wb = d;
      c.target.dispatchEvent(d);
      wb = null;
    } else return b = Cb(c), null !== b && Fc(b), a.blockedOn = c, false;
    b.shift();
  }
  return true;
}
function Zc(a, b, c) {
  Xc(a) && c.delete(b);
}
function $c() {
  Jc = false;
  null !== Lc && Xc(Lc) && (Lc = null);
  null !== Mc && Xc(Mc) && (Mc = null);
  null !== Nc && Xc(Nc) && (Nc = null);
  Oc.forEach(Zc);
  Pc.forEach(Zc);
}
function ad(a, b) {
  a.blockedOn === b && (a.blockedOn = null, Jc || (Jc = true, ca.unstable_scheduleCallback(ca.unstable_NormalPriority, $c)));
}
function bd(a) {
  function b(b2) {
    return ad(b2, a);
  }
  if (0 < Kc.length) {
    ad(Kc[0], a);
    for (var c = 1; c < Kc.length; c++) {
      var d = Kc[c];
      d.blockedOn === a && (d.blockedOn = null);
    }
  }
  null !== Lc && ad(Lc, a);
  null !== Mc && ad(Mc, a);
  null !== Nc && ad(Nc, a);
  Oc.forEach(b);
  Pc.forEach(b);
  for (c = 0; c < Qc.length; c++) d = Qc[c], d.blockedOn === a && (d.blockedOn = null);
  for (; 0 < Qc.length && (c = Qc[0], null === c.blockedOn); ) Vc(c), null === c.blockedOn && Qc.shift();
}
var cd = ua.ReactCurrentBatchConfig, dd = true;
function ed(a, b, c, d) {
  var e = C, f2 = cd.transition;
  cd.transition = null;
  try {
    C = 1, fd(a, b, c, d);
  } finally {
    C = e, cd.transition = f2;
  }
}
function gd(a, b, c, d) {
  var e = C, f2 = cd.transition;
  cd.transition = null;
  try {
    C = 4, fd(a, b, c, d);
  } finally {
    C = e, cd.transition = f2;
  }
}
function fd(a, b, c, d) {
  if (dd) {
    var e = Yc(a, b, c, d);
    if (null === e) hd(a, b, d, id, c), Sc(a, d);
    else if (Uc(e, a, b, c, d)) d.stopPropagation();
    else if (Sc(a, d), b & 4 && -1 < Rc.indexOf(a)) {
      for (; null !== e; ) {
        var f2 = Cb(e);
        null !== f2 && Ec(f2);
        f2 = Yc(a, b, c, d);
        null === f2 && hd(a, b, d, id, c);
        if (f2 === e) break;
        e = f2;
      }
      null !== e && d.stopPropagation();
    } else hd(a, b, d, null, c);
  }
}
var id = null;
function Yc(a, b, c, d) {
  id = null;
  a = xb(d);
  a = Wc(a);
  if (null !== a) if (b = Vb(a), null === b) a = null;
  else if (c = b.tag, 13 === c) {
    a = Wb(b);
    if (null !== a) return a;
    a = null;
  } else if (3 === c) {
    if (b.stateNode.current.memoizedState.isDehydrated) return 3 === b.tag ? b.stateNode.containerInfo : null;
    a = null;
  } else b !== a && (a = null);
  id = a;
  return null;
}
function jd(a) {
  switch (a) {
    case "cancel":
    case "click":
    case "close":
    case "contextmenu":
    case "copy":
    case "cut":
    case "auxclick":
    case "dblclick":
    case "dragend":
    case "dragstart":
    case "drop":
    case "focusin":
    case "focusout":
    case "input":
    case "invalid":
    case "keydown":
    case "keypress":
    case "keyup":
    case "mousedown":
    case "mouseup":
    case "paste":
    case "pause":
    case "play":
    case "pointercancel":
    case "pointerdown":
    case "pointerup":
    case "ratechange":
    case "reset":
    case "resize":
    case "seeked":
    case "submit":
    case "touchcancel":
    case "touchend":
    case "touchstart":
    case "volumechange":
    case "change":
    case "selectionchange":
    case "textInput":
    case "compositionstart":
    case "compositionend":
    case "compositionupdate":
    case "beforeblur":
    case "afterblur":
    case "beforeinput":
    case "blur":
    case "fullscreenchange":
    case "focus":
    case "hashchange":
    case "popstate":
    case "select":
    case "selectstart":
      return 1;
    case "drag":
    case "dragenter":
    case "dragexit":
    case "dragleave":
    case "dragover":
    case "mousemove":
    case "mouseout":
    case "mouseover":
    case "pointermove":
    case "pointerout":
    case "pointerover":
    case "scroll":
    case "toggle":
    case "touchmove":
    case "wheel":
    case "mouseenter":
    case "mouseleave":
    case "pointerenter":
    case "pointerleave":
      return 4;
    case "message":
      switch (ec()) {
        case fc:
          return 1;
        case gc:
          return 4;
        case hc:
        case ic:
          return 16;
        case jc:
          return 536870912;
        default:
          return 16;
      }
    default:
      return 16;
  }
}
var kd = null, ld = null, md = null;
function nd() {
  if (md) return md;
  var a, b = ld, c = b.length, d, e = "value" in kd ? kd.value : kd.textContent, f2 = e.length;
  for (a = 0; a < c && b[a] === e[a]; a++) ;
  var g = c - a;
  for (d = 1; d <= g && b[c - d] === e[f2 - d]; d++) ;
  return md = e.slice(a, 1 < d ? 1 - d : void 0);
}
function od(a) {
  var b = a.keyCode;
  "charCode" in a ? (a = a.charCode, 0 === a && 13 === b && (a = 13)) : a = b;
  10 === a && (a = 13);
  return 32 <= a || 13 === a ? a : 0;
}
function pd() {
  return true;
}
function qd() {
  return false;
}
function rd(a) {
  function b(b2, d, e, f2, g) {
    this._reactName = b2;
    this._targetInst = e;
    this.type = d;
    this.nativeEvent = f2;
    this.target = g;
    this.currentTarget = null;
    for (var c in a) a.hasOwnProperty(c) && (b2 = a[c], this[c] = b2 ? b2(f2) : f2[c]);
    this.isDefaultPrevented = (null != f2.defaultPrevented ? f2.defaultPrevented : false === f2.returnValue) ? pd : qd;
    this.isPropagationStopped = qd;
    return this;
  }
  A(b.prototype, { preventDefault: function() {
    this.defaultPrevented = true;
    var a2 = this.nativeEvent;
    a2 && (a2.preventDefault ? a2.preventDefault() : "unknown" !== typeof a2.returnValue && (a2.returnValue = false), this.isDefaultPrevented = pd);
  }, stopPropagation: function() {
    var a2 = this.nativeEvent;
    a2 && (a2.stopPropagation ? a2.stopPropagation() : "unknown" !== typeof a2.cancelBubble && (a2.cancelBubble = true), this.isPropagationStopped = pd);
  }, persist: function() {
  }, isPersistent: pd });
  return b;
}
var sd = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(a) {
  return a.timeStamp || Date.now();
}, defaultPrevented: 0, isTrusted: 0 }, td = rd(sd), ud = A({}, sd, { view: 0, detail: 0 }), vd = rd(ud), wd, xd, yd, Ad = A({}, ud, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: zd, button: 0, buttons: 0, relatedTarget: function(a) {
  return void 0 === a.relatedTarget ? a.fromElement === a.srcElement ? a.toElement : a.fromElement : a.relatedTarget;
}, movementX: function(a) {
  if ("movementX" in a) return a.movementX;
  a !== yd && (yd && "mousemove" === a.type ? (wd = a.screenX - yd.screenX, xd = a.screenY - yd.screenY) : xd = wd = 0, yd = a);
  return wd;
}, movementY: function(a) {
  return "movementY" in a ? a.movementY : xd;
} }), Bd = rd(Ad), Cd = A({}, Ad, { dataTransfer: 0 }), Dd = rd(Cd), Ed = A({}, ud, { relatedTarget: 0 }), Fd = rd(Ed), Gd = A({}, sd, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), Hd = rd(Gd), Id = A({}, sd, { clipboardData: function(a) {
  return "clipboardData" in a ? a.clipboardData : window.clipboardData;
} }), Jd = rd(Id), Kd = A({}, sd, { data: 0 }), Ld = rd(Kd), Md = {
  Esc: "Escape",
  Spacebar: " ",
  Left: "ArrowLeft",
  Up: "ArrowUp",
  Right: "ArrowRight",
  Down: "ArrowDown",
  Del: "Delete",
  Win: "OS",
  Menu: "ContextMenu",
  Apps: "ContextMenu",
  Scroll: "ScrollLock",
  MozPrintableKey: "Unidentified"
}, Nd = {
  8: "Backspace",
  9: "Tab",
  12: "Clear",
  13: "Enter",
  16: "Shift",
  17: "Control",
  18: "Alt",
  19: "Pause",
  20: "CapsLock",
  27: "Escape",
  32: " ",
  33: "PageUp",
  34: "PageDown",
  35: "End",
  36: "Home",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  45: "Insert",
  46: "Delete",
  112: "F1",
  113: "F2",
  114: "F3",
  115: "F4",
  116: "F5",
  117: "F6",
  118: "F7",
  119: "F8",
  120: "F9",
  121: "F10",
  122: "F11",
  123: "F12",
  144: "NumLock",
  145: "ScrollLock",
  224: "Meta"
}, Od = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
function Pd(a) {
  var b = this.nativeEvent;
  return b.getModifierState ? b.getModifierState(a) : (a = Od[a]) ? !!b[a] : false;
}
function zd() {
  return Pd;
}
var Qd = A({}, ud, { key: function(a) {
  if (a.key) {
    var b = Md[a.key] || a.key;
    if ("Unidentified" !== b) return b;
  }
  return "keypress" === a.type ? (a = od(a), 13 === a ? "Enter" : String.fromCharCode(a)) : "keydown" === a.type || "keyup" === a.type ? Nd[a.keyCode] || "Unidentified" : "";
}, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: zd, charCode: function(a) {
  return "keypress" === a.type ? od(a) : 0;
}, keyCode: function(a) {
  return "keydown" === a.type || "keyup" === a.type ? a.keyCode : 0;
}, which: function(a) {
  return "keypress" === a.type ? od(a) : "keydown" === a.type || "keyup" === a.type ? a.keyCode : 0;
} }), Rd = rd(Qd), Sd = A({}, Ad, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), Td = rd(Sd), Ud = A({}, ud, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: zd }), Vd = rd(Ud), Wd = A({}, sd, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), Xd = rd(Wd), Yd = A({}, Ad, {
  deltaX: function(a) {
    return "deltaX" in a ? a.deltaX : "wheelDeltaX" in a ? -a.wheelDeltaX : 0;
  },
  deltaY: function(a) {
    return "deltaY" in a ? a.deltaY : "wheelDeltaY" in a ? -a.wheelDeltaY : "wheelDelta" in a ? -a.wheelDelta : 0;
  },
  deltaZ: 0,
  deltaMode: 0
}), Zd = rd(Yd), $d = [9, 13, 27, 32], ae = ia && "CompositionEvent" in window, be = null;
ia && "documentMode" in document && (be = document.documentMode);
var ce = ia && "TextEvent" in window && !be, de = ia && (!ae || be && 8 < be && 11 >= be), ee = String.fromCharCode(32), fe = false;
function ge(a, b) {
  switch (a) {
    case "keyup":
      return -1 !== $d.indexOf(b.keyCode);
    case "keydown":
      return 229 !== b.keyCode;
    case "keypress":
    case "mousedown":
    case "focusout":
      return true;
    default:
      return false;
  }
}
function he(a) {
  a = a.detail;
  return "object" === typeof a && "data" in a ? a.data : null;
}
var ie = false;
function je(a, b) {
  switch (a) {
    case "compositionend":
      return he(b);
    case "keypress":
      if (32 !== b.which) return null;
      fe = true;
      return ee;
    case "textInput":
      return a = b.data, a === ee && fe ? null : a;
    default:
      return null;
  }
}
function ke(a, b) {
  if (ie) return "compositionend" === a || !ae && ge(a, b) ? (a = nd(), md = ld = kd = null, ie = false, a) : null;
  switch (a) {
    case "paste":
      return null;
    case "keypress":
      if (!(b.ctrlKey || b.altKey || b.metaKey) || b.ctrlKey && b.altKey) {
        if (b.char && 1 < b.char.length) return b.char;
        if (b.which) return String.fromCharCode(b.which);
      }
      return null;
    case "compositionend":
      return de && "ko" !== b.locale ? null : b.data;
    default:
      return null;
  }
}
var le = { color: true, date: true, datetime: true, "datetime-local": true, email: true, month: true, number: true, password: true, range: true, search: true, tel: true, text: true, time: true, url: true, week: true };
function me(a) {
  var b = a && a.nodeName && a.nodeName.toLowerCase();
  return "input" === b ? !!le[a.type] : "textarea" === b ? true : false;
}
function ne(a, b, c, d) {
  Eb(d);
  b = oe(b, "onChange");
  0 < b.length && (c = new td("onChange", "change", null, c, d), a.push({ event: c, listeners: b }));
}
var pe = null, qe = null;
function re(a) {
  se(a, 0);
}
function te(a) {
  var b = ue(a);
  if (Wa(b)) return a;
}
function ve(a, b) {
  if ("change" === a) return b;
}
var we = false;
if (ia) {
  var xe;
  if (ia) {
    var ye = "oninput" in document;
    if (!ye) {
      var ze = document.createElement("div");
      ze.setAttribute("oninput", "return;");
      ye = "function" === typeof ze.oninput;
    }
    xe = ye;
  } else xe = false;
  we = xe && (!document.documentMode || 9 < document.documentMode);
}
function Ae() {
  pe && (pe.detachEvent("onpropertychange", Be), qe = pe = null);
}
function Be(a) {
  if ("value" === a.propertyName && te(qe)) {
    var b = [];
    ne(b, qe, a, xb(a));
    Jb(re, b);
  }
}
function Ce(a, b, c) {
  "focusin" === a ? (Ae(), pe = b, qe = c, pe.attachEvent("onpropertychange", Be)) : "focusout" === a && Ae();
}
function De(a) {
  if ("selectionchange" === a || "keyup" === a || "keydown" === a) return te(qe);
}
function Ee(a, b) {
  if ("click" === a) return te(b);
}
function Fe(a, b) {
  if ("input" === a || "change" === a) return te(b);
}
function Ge(a, b) {
  return a === b && (0 !== a || 1 / a === 1 / b) || a !== a && b !== b;
}
var He = "function" === typeof Object.is ? Object.is : Ge;
function Ie(a, b) {
  if (He(a, b)) return true;
  if ("object" !== typeof a || null === a || "object" !== typeof b || null === b) return false;
  var c = Object.keys(a), d = Object.keys(b);
  if (c.length !== d.length) return false;
  for (d = 0; d < c.length; d++) {
    var e = c[d];
    if (!ja.call(b, e) || !He(a[e], b[e])) return false;
  }
  return true;
}
function Je(a) {
  for (; a && a.firstChild; ) a = a.firstChild;
  return a;
}
function Ke(a, b) {
  var c = Je(a);
  a = 0;
  for (var d; c; ) {
    if (3 === c.nodeType) {
      d = a + c.textContent.length;
      if (a <= b && d >= b) return { node: c, offset: b - a };
      a = d;
    }
    a: {
      for (; c; ) {
        if (c.nextSibling) {
          c = c.nextSibling;
          break a;
        }
        c = c.parentNode;
      }
      c = void 0;
    }
    c = Je(c);
  }
}
function Le(a, b) {
  return a && b ? a === b ? true : a && 3 === a.nodeType ? false : b && 3 === b.nodeType ? Le(a, b.parentNode) : "contains" in a ? a.contains(b) : a.compareDocumentPosition ? !!(a.compareDocumentPosition(b) & 16) : false : false;
}
function Me() {
  for (var a = window, b = Xa(); b instanceof a.HTMLIFrameElement; ) {
    try {
      var c = "string" === typeof b.contentWindow.location.href;
    } catch (d) {
      c = false;
    }
    if (c) a = b.contentWindow;
    else break;
    b = Xa(a.document);
  }
  return b;
}
function Ne(a) {
  var b = a && a.nodeName && a.nodeName.toLowerCase();
  return b && ("input" === b && ("text" === a.type || "search" === a.type || "tel" === a.type || "url" === a.type || "password" === a.type) || "textarea" === b || "true" === a.contentEditable);
}
function Oe(a) {
  var b = Me(), c = a.focusedElem, d = a.selectionRange;
  if (b !== c && c && c.ownerDocument && Le(c.ownerDocument.documentElement, c)) {
    if (null !== d && Ne(c)) {
      if (b = d.start, a = d.end, void 0 === a && (a = b), "selectionStart" in c) c.selectionStart = b, c.selectionEnd = Math.min(a, c.value.length);
      else if (a = (b = c.ownerDocument || document) && b.defaultView || window, a.getSelection) {
        a = a.getSelection();
        var e = c.textContent.length, f2 = Math.min(d.start, e);
        d = void 0 === d.end ? f2 : Math.min(d.end, e);
        !a.extend && f2 > d && (e = d, d = f2, f2 = e);
        e = Ke(c, f2);
        var g = Ke(
          c,
          d
        );
        e && g && (1 !== a.rangeCount || a.anchorNode !== e.node || a.anchorOffset !== e.offset || a.focusNode !== g.node || a.focusOffset !== g.offset) && (b = b.createRange(), b.setStart(e.node, e.offset), a.removeAllRanges(), f2 > d ? (a.addRange(b), a.extend(g.node, g.offset)) : (b.setEnd(g.node, g.offset), a.addRange(b)));
      }
    }
    b = [];
    for (a = c; a = a.parentNode; ) 1 === a.nodeType && b.push({ element: a, left: a.scrollLeft, top: a.scrollTop });
    "function" === typeof c.focus && c.focus();
    for (c = 0; c < b.length; c++) a = b[c], a.element.scrollLeft = a.left, a.element.scrollTop = a.top;
  }
}
var Pe = ia && "documentMode" in document && 11 >= document.documentMode, Qe = null, Re = null, Se = null, Te = false;
function Ue(a, b, c) {
  var d = c.window === c ? c.document : 9 === c.nodeType ? c : c.ownerDocument;
  Te || null == Qe || Qe !== Xa(d) || (d = Qe, "selectionStart" in d && Ne(d) ? d = { start: d.selectionStart, end: d.selectionEnd } : (d = (d.ownerDocument && d.ownerDocument.defaultView || window).getSelection(), d = { anchorNode: d.anchorNode, anchorOffset: d.anchorOffset, focusNode: d.focusNode, focusOffset: d.focusOffset }), Se && Ie(Se, d) || (Se = d, d = oe(Re, "onSelect"), 0 < d.length && (b = new td("onSelect", "select", null, b, c), a.push({ event: b, listeners: d }), b.target = Qe)));
}
function Ve(a, b) {
  var c = {};
  c[a.toLowerCase()] = b.toLowerCase();
  c["Webkit" + a] = "webkit" + b;
  c["Moz" + a] = "moz" + b;
  return c;
}
var We = { animationend: Ve("Animation", "AnimationEnd"), animationiteration: Ve("Animation", "AnimationIteration"), animationstart: Ve("Animation", "AnimationStart"), transitionend: Ve("Transition", "TransitionEnd") }, Xe = {}, Ye = {};
ia && (Ye = document.createElement("div").style, "AnimationEvent" in window || (delete We.animationend.animation, delete We.animationiteration.animation, delete We.animationstart.animation), "TransitionEvent" in window || delete We.transitionend.transition);
function Ze(a) {
  if (Xe[a]) return Xe[a];
  if (!We[a]) return a;
  var b = We[a], c;
  for (c in b) if (b.hasOwnProperty(c) && c in Ye) return Xe[a] = b[c];
  return a;
}
var $e = Ze("animationend"), af = Ze("animationiteration"), bf = Ze("animationstart"), cf = Ze("transitionend"), df = /* @__PURE__ */ new Map(), ef = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
function ff(a, b) {
  df.set(a, b);
  fa(b, [a]);
}
for (var gf = 0; gf < ef.length; gf++) {
  var hf = ef[gf], jf = hf.toLowerCase(), kf = hf[0].toUpperCase() + hf.slice(1);
  ff(jf, "on" + kf);
}
ff($e, "onAnimationEnd");
ff(af, "onAnimationIteration");
ff(bf, "onAnimationStart");
ff("dblclick", "onDoubleClick");
ff("focusin", "onFocus");
ff("focusout", "onBlur");
ff(cf, "onTransitionEnd");
ha("onMouseEnter", ["mouseout", "mouseover"]);
ha("onMouseLeave", ["mouseout", "mouseover"]);
ha("onPointerEnter", ["pointerout", "pointerover"]);
ha("onPointerLeave", ["pointerout", "pointerover"]);
fa("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" "));
fa("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));
fa("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
fa("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" "));
fa("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" "));
fa("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
var lf = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), mf = new Set("cancel close invalid load scroll toggle".split(" ").concat(lf));
function nf(a, b, c) {
  var d = a.type || "unknown-event";
  a.currentTarget = c;
  Ub(d, b, void 0, a);
  a.currentTarget = null;
}
function se(a, b) {
  b = 0 !== (b & 4);
  for (var c = 0; c < a.length; c++) {
    var d = a[c], e = d.event;
    d = d.listeners;
    a: {
      var f2 = void 0;
      if (b) for (var g = d.length - 1; 0 <= g; g--) {
        var h = d[g], k2 = h.instance, l2 = h.currentTarget;
        h = h.listener;
        if (k2 !== f2 && e.isPropagationStopped()) break a;
        nf(e, h, l2);
        f2 = k2;
      }
      else for (g = 0; g < d.length; g++) {
        h = d[g];
        k2 = h.instance;
        l2 = h.currentTarget;
        h = h.listener;
        if (k2 !== f2 && e.isPropagationStopped()) break a;
        nf(e, h, l2);
        f2 = k2;
      }
    }
  }
  if (Qb) throw a = Rb, Qb = false, Rb = null, a;
}
function D(a, b) {
  var c = b[of];
  void 0 === c && (c = b[of] = /* @__PURE__ */ new Set());
  var d = a + "__bubble";
  c.has(d) || (pf(b, a, 2, false), c.add(d));
}
function qf(a, b, c) {
  var d = 0;
  b && (d |= 4);
  pf(c, a, d, b);
}
var rf = "_reactListening" + Math.random().toString(36).slice(2);
function sf(a) {
  if (!a[rf]) {
    a[rf] = true;
    da.forEach(function(b2) {
      "selectionchange" !== b2 && (mf.has(b2) || qf(b2, false, a), qf(b2, true, a));
    });
    var b = 9 === a.nodeType ? a : a.ownerDocument;
    null === b || b[rf] || (b[rf] = true, qf("selectionchange", false, b));
  }
}
function pf(a, b, c, d) {
  switch (jd(b)) {
    case 1:
      var e = ed;
      break;
    case 4:
      e = gd;
      break;
    default:
      e = fd;
  }
  c = e.bind(null, b, c, a);
  e = void 0;
  !Lb || "touchstart" !== b && "touchmove" !== b && "wheel" !== b || (e = true);
  d ? void 0 !== e ? a.addEventListener(b, c, { capture: true, passive: e }) : a.addEventListener(b, c, true) : void 0 !== e ? a.addEventListener(b, c, { passive: e }) : a.addEventListener(b, c, false);
}
function hd(a, b, c, d, e) {
  var f2 = d;
  if (0 === (b & 1) && 0 === (b & 2) && null !== d) a: for (; ; ) {
    if (null === d) return;
    var g = d.tag;
    if (3 === g || 4 === g) {
      var h = d.stateNode.containerInfo;
      if (h === e || 8 === h.nodeType && h.parentNode === e) break;
      if (4 === g) for (g = d.return; null !== g; ) {
        var k2 = g.tag;
        if (3 === k2 || 4 === k2) {
          if (k2 = g.stateNode.containerInfo, k2 === e || 8 === k2.nodeType && k2.parentNode === e) return;
        }
        g = g.return;
      }
      for (; null !== h; ) {
        g = Wc(h);
        if (null === g) return;
        k2 = g.tag;
        if (5 === k2 || 6 === k2) {
          d = f2 = g;
          continue a;
        }
        h = h.parentNode;
      }
    }
    d = d.return;
  }
  Jb(function() {
    var d2 = f2, e2 = xb(c), g2 = [];
    a: {
      var h2 = df.get(a);
      if (void 0 !== h2) {
        var k3 = td, n2 = a;
        switch (a) {
          case "keypress":
            if (0 === od(c)) break a;
          case "keydown":
          case "keyup":
            k3 = Rd;
            break;
          case "focusin":
            n2 = "focus";
            k3 = Fd;
            break;
          case "focusout":
            n2 = "blur";
            k3 = Fd;
            break;
          case "beforeblur":
          case "afterblur":
            k3 = Fd;
            break;
          case "click":
            if (2 === c.button) break a;
          case "auxclick":
          case "dblclick":
          case "mousedown":
          case "mousemove":
          case "mouseup":
          case "mouseout":
          case "mouseover":
          case "contextmenu":
            k3 = Bd;
            break;
          case "drag":
          case "dragend":
          case "dragenter":
          case "dragexit":
          case "dragleave":
          case "dragover":
          case "dragstart":
          case "drop":
            k3 = Dd;
            break;
          case "touchcancel":
          case "touchend":
          case "touchmove":
          case "touchstart":
            k3 = Vd;
            break;
          case $e:
          case af:
          case bf:
            k3 = Hd;
            break;
          case cf:
            k3 = Xd;
            break;
          case "scroll":
            k3 = vd;
            break;
          case "wheel":
            k3 = Zd;
            break;
          case "copy":
          case "cut":
          case "paste":
            k3 = Jd;
            break;
          case "gotpointercapture":
          case "lostpointercapture":
          case "pointercancel":
          case "pointerdown":
          case "pointermove":
          case "pointerout":
          case "pointerover":
          case "pointerup":
            k3 = Td;
        }
        var t2 = 0 !== (b & 4), J2 = !t2 && "scroll" === a, x2 = t2 ? null !== h2 ? h2 + "Capture" : null : h2;
        t2 = [];
        for (var w2 = d2, u2; null !== w2; ) {
          u2 = w2;
          var F2 = u2.stateNode;
          5 === u2.tag && null !== F2 && (u2 = F2, null !== x2 && (F2 = Kb(w2, x2), null != F2 && t2.push(tf(w2, F2, u2))));
          if (J2) break;
          w2 = w2.return;
        }
        0 < t2.length && (h2 = new k3(h2, n2, null, c, e2), g2.push({ event: h2, listeners: t2 }));
      }
    }
    if (0 === (b & 7)) {
      a: {
        h2 = "mouseover" === a || "pointerover" === a;
        k3 = "mouseout" === a || "pointerout" === a;
        if (h2 && c !== wb && (n2 = c.relatedTarget || c.fromElement) && (Wc(n2) || n2[uf])) break a;
        if (k3 || h2) {
          h2 = e2.window === e2 ? e2 : (h2 = e2.ownerDocument) ? h2.defaultView || h2.parentWindow : window;
          if (k3) {
            if (n2 = c.relatedTarget || c.toElement, k3 = d2, n2 = n2 ? Wc(n2) : null, null !== n2 && (J2 = Vb(n2), n2 !== J2 || 5 !== n2.tag && 6 !== n2.tag)) n2 = null;
          } else k3 = null, n2 = d2;
          if (k3 !== n2) {
            t2 = Bd;
            F2 = "onMouseLeave";
            x2 = "onMouseEnter";
            w2 = "mouse";
            if ("pointerout" === a || "pointerover" === a) t2 = Td, F2 = "onPointerLeave", x2 = "onPointerEnter", w2 = "pointer";
            J2 = null == k3 ? h2 : ue(k3);
            u2 = null == n2 ? h2 : ue(n2);
            h2 = new t2(F2, w2 + "leave", k3, c, e2);
            h2.target = J2;
            h2.relatedTarget = u2;
            F2 = null;
            Wc(e2) === d2 && (t2 = new t2(x2, w2 + "enter", n2, c, e2), t2.target = u2, t2.relatedTarget = J2, F2 = t2);
            J2 = F2;
            if (k3 && n2) b: {
              t2 = k3;
              x2 = n2;
              w2 = 0;
              for (u2 = t2; u2; u2 = vf(u2)) w2++;
              u2 = 0;
              for (F2 = x2; F2; F2 = vf(F2)) u2++;
              for (; 0 < w2 - u2; ) t2 = vf(t2), w2--;
              for (; 0 < u2 - w2; ) x2 = vf(x2), u2--;
              for (; w2--; ) {
                if (t2 === x2 || null !== x2 && t2 === x2.alternate) break b;
                t2 = vf(t2);
                x2 = vf(x2);
              }
              t2 = null;
            }
            else t2 = null;
            null !== k3 && wf(g2, h2, k3, t2, false);
            null !== n2 && null !== J2 && wf(g2, J2, n2, t2, true);
          }
        }
      }
      a: {
        h2 = d2 ? ue(d2) : window;
        k3 = h2.nodeName && h2.nodeName.toLowerCase();
        if ("select" === k3 || "input" === k3 && "file" === h2.type) var na = ve;
        else if (me(h2)) if (we) na = Fe;
        else {
          na = De;
          var xa = Ce;
        }
        else (k3 = h2.nodeName) && "input" === k3.toLowerCase() && ("checkbox" === h2.type || "radio" === h2.type) && (na = Ee);
        if (na && (na = na(a, d2))) {
          ne(g2, na, c, e2);
          break a;
        }
        xa && xa(a, h2, d2);
        "focusout" === a && (xa = h2._wrapperState) && xa.controlled && "number" === h2.type && cb(h2, "number", h2.value);
      }
      xa = d2 ? ue(d2) : window;
      switch (a) {
        case "focusin":
          if (me(xa) || "true" === xa.contentEditable) Qe = xa, Re = d2, Se = null;
          break;
        case "focusout":
          Se = Re = Qe = null;
          break;
        case "mousedown":
          Te = true;
          break;
        case "contextmenu":
        case "mouseup":
        case "dragend":
          Te = false;
          Ue(g2, c, e2);
          break;
        case "selectionchange":
          if (Pe) break;
        case "keydown":
        case "keyup":
          Ue(g2, c, e2);
      }
      var $a;
      if (ae) b: {
        switch (a) {
          case "compositionstart":
            var ba = "onCompositionStart";
            break b;
          case "compositionend":
            ba = "onCompositionEnd";
            break b;
          case "compositionupdate":
            ba = "onCompositionUpdate";
            break b;
        }
        ba = void 0;
      }
      else ie ? ge(a, c) && (ba = "onCompositionEnd") : "keydown" === a && 229 === c.keyCode && (ba = "onCompositionStart");
      ba && (de && "ko" !== c.locale && (ie || "onCompositionStart" !== ba ? "onCompositionEnd" === ba && ie && ($a = nd()) : (kd = e2, ld = "value" in kd ? kd.value : kd.textContent, ie = true)), xa = oe(d2, ba), 0 < xa.length && (ba = new Ld(ba, a, null, c, e2), g2.push({ event: ba, listeners: xa }), $a ? ba.data = $a : ($a = he(c), null !== $a && (ba.data = $a))));
      if ($a = ce ? je(a, c) : ke(a, c)) d2 = oe(d2, "onBeforeInput"), 0 < d2.length && (e2 = new Ld("onBeforeInput", "beforeinput", null, c, e2), g2.push({ event: e2, listeners: d2 }), e2.data = $a);
    }
    se(g2, b);
  });
}
function tf(a, b, c) {
  return { instance: a, listener: b, currentTarget: c };
}
function oe(a, b) {
  for (var c = b + "Capture", d = []; null !== a; ) {
    var e = a, f2 = e.stateNode;
    5 === e.tag && null !== f2 && (e = f2, f2 = Kb(a, c), null != f2 && d.unshift(tf(a, f2, e)), f2 = Kb(a, b), null != f2 && d.push(tf(a, f2, e)));
    a = a.return;
  }
  return d;
}
function vf(a) {
  if (null === a) return null;
  do
    a = a.return;
  while (a && 5 !== a.tag);
  return a ? a : null;
}
function wf(a, b, c, d, e) {
  for (var f2 = b._reactName, g = []; null !== c && c !== d; ) {
    var h = c, k2 = h.alternate, l2 = h.stateNode;
    if (null !== k2 && k2 === d) break;
    5 === h.tag && null !== l2 && (h = l2, e ? (k2 = Kb(c, f2), null != k2 && g.unshift(tf(c, k2, h))) : e || (k2 = Kb(c, f2), null != k2 && g.push(tf(c, k2, h))));
    c = c.return;
  }
  0 !== g.length && a.push({ event: b, listeners: g });
}
var xf = /\r\n?/g, yf = /\u0000|\uFFFD/g;
function zf(a) {
  return ("string" === typeof a ? a : "" + a).replace(xf, "\n").replace(yf, "");
}
function Af(a, b, c) {
  b = zf(b);
  if (zf(a) !== b && c) throw Error(p(425));
}
function Bf() {
}
var Cf = null, Df = null;
function Ef(a, b) {
  return "textarea" === a || "noscript" === a || "string" === typeof b.children || "number" === typeof b.children || "object" === typeof b.dangerouslySetInnerHTML && null !== b.dangerouslySetInnerHTML && null != b.dangerouslySetInnerHTML.__html;
}
var Ff = "function" === typeof setTimeout ? setTimeout : void 0, Gf = "function" === typeof clearTimeout ? clearTimeout : void 0, Hf = "function" === typeof Promise ? Promise : void 0, Jf = "function" === typeof queueMicrotask ? queueMicrotask : "undefined" !== typeof Hf ? function(a) {
  return Hf.resolve(null).then(a).catch(If);
} : Ff;
function If(a) {
  setTimeout(function() {
    throw a;
  });
}
function Kf(a, b) {
  var c = b, d = 0;
  do {
    var e = c.nextSibling;
    a.removeChild(c);
    if (e && 8 === e.nodeType) if (c = e.data, "/$" === c) {
      if (0 === d) {
        a.removeChild(e);
        bd(b);
        return;
      }
      d--;
    } else "$" !== c && "$?" !== c && "$!" !== c || d++;
    c = e;
  } while (c);
  bd(b);
}
function Lf(a) {
  for (; null != a; a = a.nextSibling) {
    var b = a.nodeType;
    if (1 === b || 3 === b) break;
    if (8 === b) {
      b = a.data;
      if ("$" === b || "$!" === b || "$?" === b) break;
      if ("/$" === b) return null;
    }
  }
  return a;
}
function Mf(a) {
  a = a.previousSibling;
  for (var b = 0; a; ) {
    if (8 === a.nodeType) {
      var c = a.data;
      if ("$" === c || "$!" === c || "$?" === c) {
        if (0 === b) return a;
        b--;
      } else "/$" === c && b++;
    }
    a = a.previousSibling;
  }
  return null;
}
var Nf = Math.random().toString(36).slice(2), Of = "__reactFiber$" + Nf, Pf = "__reactProps$" + Nf, uf = "__reactContainer$" + Nf, of = "__reactEvents$" + Nf, Qf = "__reactListeners$" + Nf, Rf = "__reactHandles$" + Nf;
function Wc(a) {
  var b = a[Of];
  if (b) return b;
  for (var c = a.parentNode; c; ) {
    if (b = c[uf] || c[Of]) {
      c = b.alternate;
      if (null !== b.child || null !== c && null !== c.child) for (a = Mf(a); null !== a; ) {
        if (c = a[Of]) return c;
        a = Mf(a);
      }
      return b;
    }
    a = c;
    c = a.parentNode;
  }
  return null;
}
function Cb(a) {
  a = a[Of] || a[uf];
  return !a || 5 !== a.tag && 6 !== a.tag && 13 !== a.tag && 3 !== a.tag ? null : a;
}
function ue(a) {
  if (5 === a.tag || 6 === a.tag) return a.stateNode;
  throw Error(p(33));
}
function Db(a) {
  return a[Pf] || null;
}
var Sf = [], Tf = -1;
function Uf(a) {
  return { current: a };
}
function E(a) {
  0 > Tf || (a.current = Sf[Tf], Sf[Tf] = null, Tf--);
}
function G(a, b) {
  Tf++;
  Sf[Tf] = a.current;
  a.current = b;
}
var Vf = {}, H = Uf(Vf), Wf = Uf(false), Xf = Vf;
function Yf(a, b) {
  var c = a.type.contextTypes;
  if (!c) return Vf;
  var d = a.stateNode;
  if (d && d.__reactInternalMemoizedUnmaskedChildContext === b) return d.__reactInternalMemoizedMaskedChildContext;
  var e = {}, f2;
  for (f2 in c) e[f2] = b[f2];
  d && (a = a.stateNode, a.__reactInternalMemoizedUnmaskedChildContext = b, a.__reactInternalMemoizedMaskedChildContext = e);
  return e;
}
function Zf(a) {
  a = a.childContextTypes;
  return null !== a && void 0 !== a;
}
function $f() {
  E(Wf);
  E(H);
}
function ag(a, b, c) {
  if (H.current !== Vf) throw Error(p(168));
  G(H, b);
  G(Wf, c);
}
function bg(a, b, c) {
  var d = a.stateNode;
  b = b.childContextTypes;
  if ("function" !== typeof d.getChildContext) return c;
  d = d.getChildContext();
  for (var e in d) if (!(e in b)) throw Error(p(108, Ra(a) || "Unknown", e));
  return A({}, c, d);
}
function cg(a) {
  a = (a = a.stateNode) && a.__reactInternalMemoizedMergedChildContext || Vf;
  Xf = H.current;
  G(H, a);
  G(Wf, Wf.current);
  return true;
}
function dg(a, b, c) {
  var d = a.stateNode;
  if (!d) throw Error(p(169));
  c ? (a = bg(a, b, Xf), d.__reactInternalMemoizedMergedChildContext = a, E(Wf), E(H), G(H, a)) : E(Wf);
  G(Wf, c);
}
var eg = null, fg = false, gg = false;
function hg(a) {
  null === eg ? eg = [a] : eg.push(a);
}
function ig(a) {
  fg = true;
  hg(a);
}
function jg() {
  if (!gg && null !== eg) {
    gg = true;
    var a = 0, b = C;
    try {
      var c = eg;
      for (C = 1; a < c.length; a++) {
        var d = c[a];
        do
          d = d(true);
        while (null !== d);
      }
      eg = null;
      fg = false;
    } catch (e) {
      throw null !== eg && (eg = eg.slice(a + 1)), ac(fc, jg), e;
    } finally {
      C = b, gg = false;
    }
  }
  return null;
}
var kg = [], lg = 0, mg = null, ng = 0, og = [], pg = 0, qg = null, rg = 1, sg = "";
function tg(a, b) {
  kg[lg++] = ng;
  kg[lg++] = mg;
  mg = a;
  ng = b;
}
function ug(a, b, c) {
  og[pg++] = rg;
  og[pg++] = sg;
  og[pg++] = qg;
  qg = a;
  var d = rg;
  a = sg;
  var e = 32 - oc(d) - 1;
  d &= ~(1 << e);
  c += 1;
  var f2 = 32 - oc(b) + e;
  if (30 < f2) {
    var g = e - e % 5;
    f2 = (d & (1 << g) - 1).toString(32);
    d >>= g;
    e -= g;
    rg = 1 << 32 - oc(b) + e | c << e | d;
    sg = f2 + a;
  } else rg = 1 << f2 | c << e | d, sg = a;
}
function vg(a) {
  null !== a.return && (tg(a, 1), ug(a, 1, 0));
}
function wg(a) {
  for (; a === mg; ) mg = kg[--lg], kg[lg] = null, ng = kg[--lg], kg[lg] = null;
  for (; a === qg; ) qg = og[--pg], og[pg] = null, sg = og[--pg], og[pg] = null, rg = og[--pg], og[pg] = null;
}
var xg = null, yg = null, I = false, zg = null;
function Ag(a, b) {
  var c = Bg(5, null, null, 0);
  c.elementType = "DELETED";
  c.stateNode = b;
  c.return = a;
  b = a.deletions;
  null === b ? (a.deletions = [c], a.flags |= 16) : b.push(c);
}
function Cg(a, b) {
  switch (a.tag) {
    case 5:
      var c = a.type;
      b = 1 !== b.nodeType || c.toLowerCase() !== b.nodeName.toLowerCase() ? null : b;
      return null !== b ? (a.stateNode = b, xg = a, yg = Lf(b.firstChild), true) : false;
    case 6:
      return b = "" === a.pendingProps || 3 !== b.nodeType ? null : b, null !== b ? (a.stateNode = b, xg = a, yg = null, true) : false;
    case 13:
      return b = 8 !== b.nodeType ? null : b, null !== b ? (c = null !== qg ? { id: rg, overflow: sg } : null, a.memoizedState = { dehydrated: b, treeContext: c, retryLane: 1073741824 }, c = Bg(18, null, null, 0), c.stateNode = b, c.return = a, a.child = c, xg = a, yg = null, true) : false;
    default:
      return false;
  }
}
function Dg(a) {
  return 0 !== (a.mode & 1) && 0 === (a.flags & 128);
}
function Eg(a) {
  if (I) {
    var b = yg;
    if (b) {
      var c = b;
      if (!Cg(a, b)) {
        if (Dg(a)) throw Error(p(418));
        b = Lf(c.nextSibling);
        var d = xg;
        b && Cg(a, b) ? Ag(d, c) : (a.flags = a.flags & -4097 | 2, I = false, xg = a);
      }
    } else {
      if (Dg(a)) throw Error(p(418));
      a.flags = a.flags & -4097 | 2;
      I = false;
      xg = a;
    }
  }
}
function Fg(a) {
  for (a = a.return; null !== a && 5 !== a.tag && 3 !== a.tag && 13 !== a.tag; ) a = a.return;
  xg = a;
}
function Gg(a) {
  if (a !== xg) return false;
  if (!I) return Fg(a), I = true, false;
  var b;
  (b = 3 !== a.tag) && !(b = 5 !== a.tag) && (b = a.type, b = "head" !== b && "body" !== b && !Ef(a.type, a.memoizedProps));
  if (b && (b = yg)) {
    if (Dg(a)) throw Hg(), Error(p(418));
    for (; b; ) Ag(a, b), b = Lf(b.nextSibling);
  }
  Fg(a);
  if (13 === a.tag) {
    a = a.memoizedState;
    a = null !== a ? a.dehydrated : null;
    if (!a) throw Error(p(317));
    a: {
      a = a.nextSibling;
      for (b = 0; a; ) {
        if (8 === a.nodeType) {
          var c = a.data;
          if ("/$" === c) {
            if (0 === b) {
              yg = Lf(a.nextSibling);
              break a;
            }
            b--;
          } else "$" !== c && "$!" !== c && "$?" !== c || b++;
        }
        a = a.nextSibling;
      }
      yg = null;
    }
  } else yg = xg ? Lf(a.stateNode.nextSibling) : null;
  return true;
}
function Hg() {
  for (var a = yg; a; ) a = Lf(a.nextSibling);
}
function Ig() {
  yg = xg = null;
  I = false;
}
function Jg(a) {
  null === zg ? zg = [a] : zg.push(a);
}
var Kg = ua.ReactCurrentBatchConfig;
function Lg(a, b, c) {
  a = c.ref;
  if (null !== a && "function" !== typeof a && "object" !== typeof a) {
    if (c._owner) {
      c = c._owner;
      if (c) {
        if (1 !== c.tag) throw Error(p(309));
        var d = c.stateNode;
      }
      if (!d) throw Error(p(147, a));
      var e = d, f2 = "" + a;
      if (null !== b && null !== b.ref && "function" === typeof b.ref && b.ref._stringRef === f2) return b.ref;
      b = function(a2) {
        var b2 = e.refs;
        null === a2 ? delete b2[f2] : b2[f2] = a2;
      };
      b._stringRef = f2;
      return b;
    }
    if ("string" !== typeof a) throw Error(p(284));
    if (!c._owner) throw Error(p(290, a));
  }
  return a;
}
function Mg(a, b) {
  a = Object.prototype.toString.call(b);
  throw Error(p(31, "[object Object]" === a ? "object with keys {" + Object.keys(b).join(", ") + "}" : a));
}
function Ng(a) {
  var b = a._init;
  return b(a._payload);
}
function Og(a) {
  function b(b2, c2) {
    if (a) {
      var d2 = b2.deletions;
      null === d2 ? (b2.deletions = [c2], b2.flags |= 16) : d2.push(c2);
    }
  }
  function c(c2, d2) {
    if (!a) return null;
    for (; null !== d2; ) b(c2, d2), d2 = d2.sibling;
    return null;
  }
  function d(a2, b2) {
    for (a2 = /* @__PURE__ */ new Map(); null !== b2; ) null !== b2.key ? a2.set(b2.key, b2) : a2.set(b2.index, b2), b2 = b2.sibling;
    return a2;
  }
  function e(a2, b2) {
    a2 = Pg(a2, b2);
    a2.index = 0;
    a2.sibling = null;
    return a2;
  }
  function f2(b2, c2, d2) {
    b2.index = d2;
    if (!a) return b2.flags |= 1048576, c2;
    d2 = b2.alternate;
    if (null !== d2) return d2 = d2.index, d2 < c2 ? (b2.flags |= 2, c2) : d2;
    b2.flags |= 2;
    return c2;
  }
  function g(b2) {
    a && null === b2.alternate && (b2.flags |= 2);
    return b2;
  }
  function h(a2, b2, c2, d2) {
    if (null === b2 || 6 !== b2.tag) return b2 = Qg(c2, a2.mode, d2), b2.return = a2, b2;
    b2 = e(b2, c2);
    b2.return = a2;
    return b2;
  }
  function k2(a2, b2, c2, d2) {
    var f3 = c2.type;
    if (f3 === ya) return m2(a2, b2, c2.props.children, d2, c2.key);
    if (null !== b2 && (b2.elementType === f3 || "object" === typeof f3 && null !== f3 && f3.$$typeof === Ha && Ng(f3) === b2.type)) return d2 = e(b2, c2.props), d2.ref = Lg(a2, b2, c2), d2.return = a2, d2;
    d2 = Rg(c2.type, c2.key, c2.props, null, a2.mode, d2);
    d2.ref = Lg(a2, b2, c2);
    d2.return = a2;
    return d2;
  }
  function l2(a2, b2, c2, d2) {
    if (null === b2 || 4 !== b2.tag || b2.stateNode.containerInfo !== c2.containerInfo || b2.stateNode.implementation !== c2.implementation) return b2 = Sg(c2, a2.mode, d2), b2.return = a2, b2;
    b2 = e(b2, c2.children || []);
    b2.return = a2;
    return b2;
  }
  function m2(a2, b2, c2, d2, f3) {
    if (null === b2 || 7 !== b2.tag) return b2 = Tg(c2, a2.mode, d2, f3), b2.return = a2, b2;
    b2 = e(b2, c2);
    b2.return = a2;
    return b2;
  }
  function q2(a2, b2, c2) {
    if ("string" === typeof b2 && "" !== b2 || "number" === typeof b2) return b2 = Qg("" + b2, a2.mode, c2), b2.return = a2, b2;
    if ("object" === typeof b2 && null !== b2) {
      switch (b2.$$typeof) {
        case va:
          return c2 = Rg(b2.type, b2.key, b2.props, null, a2.mode, c2), c2.ref = Lg(a2, null, b2), c2.return = a2, c2;
        case wa:
          return b2 = Sg(b2, a2.mode, c2), b2.return = a2, b2;
        case Ha:
          var d2 = b2._init;
          return q2(a2, d2(b2._payload), c2);
      }
      if (eb(b2) || Ka(b2)) return b2 = Tg(b2, a2.mode, c2, null), b2.return = a2, b2;
      Mg(a2, b2);
    }
    return null;
  }
  function r2(a2, b2, c2, d2) {
    var e2 = null !== b2 ? b2.key : null;
    if ("string" === typeof c2 && "" !== c2 || "number" === typeof c2) return null !== e2 ? null : h(a2, b2, "" + c2, d2);
    if ("object" === typeof c2 && null !== c2) {
      switch (c2.$$typeof) {
        case va:
          return c2.key === e2 ? k2(a2, b2, c2, d2) : null;
        case wa:
          return c2.key === e2 ? l2(a2, b2, c2, d2) : null;
        case Ha:
          return e2 = c2._init, r2(
            a2,
            b2,
            e2(c2._payload),
            d2
          );
      }
      if (eb(c2) || Ka(c2)) return null !== e2 ? null : m2(a2, b2, c2, d2, null);
      Mg(a2, c2);
    }
    return null;
  }
  function y2(a2, b2, c2, d2, e2) {
    if ("string" === typeof d2 && "" !== d2 || "number" === typeof d2) return a2 = a2.get(c2) || null, h(b2, a2, "" + d2, e2);
    if ("object" === typeof d2 && null !== d2) {
      switch (d2.$$typeof) {
        case va:
          return a2 = a2.get(null === d2.key ? c2 : d2.key) || null, k2(b2, a2, d2, e2);
        case wa:
          return a2 = a2.get(null === d2.key ? c2 : d2.key) || null, l2(b2, a2, d2, e2);
        case Ha:
          var f3 = d2._init;
          return y2(a2, b2, c2, f3(d2._payload), e2);
      }
      if (eb(d2) || Ka(d2)) return a2 = a2.get(c2) || null, m2(b2, a2, d2, e2, null);
      Mg(b2, d2);
    }
    return null;
  }
  function n2(e2, g2, h2, k3) {
    for (var l3 = null, m3 = null, u2 = g2, w2 = g2 = 0, x2 = null; null !== u2 && w2 < h2.length; w2++) {
      u2.index > w2 ? (x2 = u2, u2 = null) : x2 = u2.sibling;
      var n3 = r2(e2, u2, h2[w2], k3);
      if (null === n3) {
        null === u2 && (u2 = x2);
        break;
      }
      a && u2 && null === n3.alternate && b(e2, u2);
      g2 = f2(n3, g2, w2);
      null === m3 ? l3 = n3 : m3.sibling = n3;
      m3 = n3;
      u2 = x2;
    }
    if (w2 === h2.length) return c(e2, u2), I && tg(e2, w2), l3;
    if (null === u2) {
      for (; w2 < h2.length; w2++) u2 = q2(e2, h2[w2], k3), null !== u2 && (g2 = f2(u2, g2, w2), null === m3 ? l3 = u2 : m3.sibling = u2, m3 = u2);
      I && tg(e2, w2);
      return l3;
    }
    for (u2 = d(e2, u2); w2 < h2.length; w2++) x2 = y2(u2, e2, w2, h2[w2], k3), null !== x2 && (a && null !== x2.alternate && u2.delete(null === x2.key ? w2 : x2.key), g2 = f2(x2, g2, w2), null === m3 ? l3 = x2 : m3.sibling = x2, m3 = x2);
    a && u2.forEach(function(a2) {
      return b(e2, a2);
    });
    I && tg(e2, w2);
    return l3;
  }
  function t2(e2, g2, h2, k3) {
    var l3 = Ka(h2);
    if ("function" !== typeof l3) throw Error(p(150));
    h2 = l3.call(h2);
    if (null == h2) throw Error(p(151));
    for (var u2 = l3 = null, m3 = g2, w2 = g2 = 0, x2 = null, n3 = h2.next(); null !== m3 && !n3.done; w2++, n3 = h2.next()) {
      m3.index > w2 ? (x2 = m3, m3 = null) : x2 = m3.sibling;
      var t3 = r2(e2, m3, n3.value, k3);
      if (null === t3) {
        null === m3 && (m3 = x2);
        break;
      }
      a && m3 && null === t3.alternate && b(e2, m3);
      g2 = f2(t3, g2, w2);
      null === u2 ? l3 = t3 : u2.sibling = t3;
      u2 = t3;
      m3 = x2;
    }
    if (n3.done) return c(
      e2,
      m3
    ), I && tg(e2, w2), l3;
    if (null === m3) {
      for (; !n3.done; w2++, n3 = h2.next()) n3 = q2(e2, n3.value, k3), null !== n3 && (g2 = f2(n3, g2, w2), null === u2 ? l3 = n3 : u2.sibling = n3, u2 = n3);
      I && tg(e2, w2);
      return l3;
    }
    for (m3 = d(e2, m3); !n3.done; w2++, n3 = h2.next()) n3 = y2(m3, e2, w2, n3.value, k3), null !== n3 && (a && null !== n3.alternate && m3.delete(null === n3.key ? w2 : n3.key), g2 = f2(n3, g2, w2), null === u2 ? l3 = n3 : u2.sibling = n3, u2 = n3);
    a && m3.forEach(function(a2) {
      return b(e2, a2);
    });
    I && tg(e2, w2);
    return l3;
  }
  function J2(a2, d2, f3, h2) {
    "object" === typeof f3 && null !== f3 && f3.type === ya && null === f3.key && (f3 = f3.props.children);
    if ("object" === typeof f3 && null !== f3) {
      switch (f3.$$typeof) {
        case va:
          a: {
            for (var k3 = f3.key, l3 = d2; null !== l3; ) {
              if (l3.key === k3) {
                k3 = f3.type;
                if (k3 === ya) {
                  if (7 === l3.tag) {
                    c(a2, l3.sibling);
                    d2 = e(l3, f3.props.children);
                    d2.return = a2;
                    a2 = d2;
                    break a;
                  }
                } else if (l3.elementType === k3 || "object" === typeof k3 && null !== k3 && k3.$$typeof === Ha && Ng(k3) === l3.type) {
                  c(a2, l3.sibling);
                  d2 = e(l3, f3.props);
                  d2.ref = Lg(a2, l3, f3);
                  d2.return = a2;
                  a2 = d2;
                  break a;
                }
                c(a2, l3);
                break;
              } else b(a2, l3);
              l3 = l3.sibling;
            }
            f3.type === ya ? (d2 = Tg(f3.props.children, a2.mode, h2, f3.key), d2.return = a2, a2 = d2) : (h2 = Rg(f3.type, f3.key, f3.props, null, a2.mode, h2), h2.ref = Lg(a2, d2, f3), h2.return = a2, a2 = h2);
          }
          return g(a2);
        case wa:
          a: {
            for (l3 = f3.key; null !== d2; ) {
              if (d2.key === l3) if (4 === d2.tag && d2.stateNode.containerInfo === f3.containerInfo && d2.stateNode.implementation === f3.implementation) {
                c(a2, d2.sibling);
                d2 = e(d2, f3.children || []);
                d2.return = a2;
                a2 = d2;
                break a;
              } else {
                c(a2, d2);
                break;
              }
              else b(a2, d2);
              d2 = d2.sibling;
            }
            d2 = Sg(f3, a2.mode, h2);
            d2.return = a2;
            a2 = d2;
          }
          return g(a2);
        case Ha:
          return l3 = f3._init, J2(a2, d2, l3(f3._payload), h2);
      }
      if (eb(f3)) return n2(a2, d2, f3, h2);
      if (Ka(f3)) return t2(a2, d2, f3, h2);
      Mg(a2, f3);
    }
    return "string" === typeof f3 && "" !== f3 || "number" === typeof f3 ? (f3 = "" + f3, null !== d2 && 6 === d2.tag ? (c(a2, d2.sibling), d2 = e(d2, f3), d2.return = a2, a2 = d2) : (c(a2, d2), d2 = Qg(f3, a2.mode, h2), d2.return = a2, a2 = d2), g(a2)) : c(a2, d2);
  }
  return J2;
}
var Ug = Og(true), Vg = Og(false), Wg = Uf(null), Xg = null, Yg = null, Zg = null;
function $g() {
  Zg = Yg = Xg = null;
}
function ah(a) {
  var b = Wg.current;
  E(Wg);
  a._currentValue = b;
}
function bh(a, b, c) {
  for (; null !== a; ) {
    var d = a.alternate;
    (a.childLanes & b) !== b ? (a.childLanes |= b, null !== d && (d.childLanes |= b)) : null !== d && (d.childLanes & b) !== b && (d.childLanes |= b);
    if (a === c) break;
    a = a.return;
  }
}
function ch(a, b) {
  Xg = a;
  Zg = Yg = null;
  a = a.dependencies;
  null !== a && null !== a.firstContext && (0 !== (a.lanes & b) && (dh = true), a.firstContext = null);
}
function eh(a) {
  var b = a._currentValue;
  if (Zg !== a) if (a = { context: a, memoizedValue: b, next: null }, null === Yg) {
    if (null === Xg) throw Error(p(308));
    Yg = a;
    Xg.dependencies = { lanes: 0, firstContext: a };
  } else Yg = Yg.next = a;
  return b;
}
var fh = null;
function gh(a) {
  null === fh ? fh = [a] : fh.push(a);
}
function hh(a, b, c, d) {
  var e = b.interleaved;
  null === e ? (c.next = c, gh(b)) : (c.next = e.next, e.next = c);
  b.interleaved = c;
  return ih(a, d);
}
function ih(a, b) {
  a.lanes |= b;
  var c = a.alternate;
  null !== c && (c.lanes |= b);
  c = a;
  for (a = a.return; null !== a; ) a.childLanes |= b, c = a.alternate, null !== c && (c.childLanes |= b), c = a, a = a.return;
  return 3 === c.tag ? c.stateNode : null;
}
var jh = false;
function kh(a) {
  a.updateQueue = { baseState: a.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
}
function lh(a, b) {
  a = a.updateQueue;
  b.updateQueue === a && (b.updateQueue = { baseState: a.baseState, firstBaseUpdate: a.firstBaseUpdate, lastBaseUpdate: a.lastBaseUpdate, shared: a.shared, effects: a.effects });
}
function mh(a, b) {
  return { eventTime: a, lane: b, tag: 0, payload: null, callback: null, next: null };
}
function nh(a, b, c) {
  var d = a.updateQueue;
  if (null === d) return null;
  d = d.shared;
  if (0 !== (K & 2)) {
    var e = d.pending;
    null === e ? b.next = b : (b.next = e.next, e.next = b);
    d.pending = b;
    return ih(a, c);
  }
  e = d.interleaved;
  null === e ? (b.next = b, gh(d)) : (b.next = e.next, e.next = b);
  d.interleaved = b;
  return ih(a, c);
}
function oh(a, b, c) {
  b = b.updateQueue;
  if (null !== b && (b = b.shared, 0 !== (c & 4194240))) {
    var d = b.lanes;
    d &= a.pendingLanes;
    c |= d;
    b.lanes = c;
    Cc(a, c);
  }
}
function ph(a, b) {
  var c = a.updateQueue, d = a.alternate;
  if (null !== d && (d = d.updateQueue, c === d)) {
    var e = null, f2 = null;
    c = c.firstBaseUpdate;
    if (null !== c) {
      do {
        var g = { eventTime: c.eventTime, lane: c.lane, tag: c.tag, payload: c.payload, callback: c.callback, next: null };
        null === f2 ? e = f2 = g : f2 = f2.next = g;
        c = c.next;
      } while (null !== c);
      null === f2 ? e = f2 = b : f2 = f2.next = b;
    } else e = f2 = b;
    c = { baseState: d.baseState, firstBaseUpdate: e, lastBaseUpdate: f2, shared: d.shared, effects: d.effects };
    a.updateQueue = c;
    return;
  }
  a = c.lastBaseUpdate;
  null === a ? c.firstBaseUpdate = b : a.next = b;
  c.lastBaseUpdate = b;
}
function qh(a, b, c, d) {
  var e = a.updateQueue;
  jh = false;
  var f2 = e.firstBaseUpdate, g = e.lastBaseUpdate, h = e.shared.pending;
  if (null !== h) {
    e.shared.pending = null;
    var k2 = h, l2 = k2.next;
    k2.next = null;
    null === g ? f2 = l2 : g.next = l2;
    g = k2;
    var m2 = a.alternate;
    null !== m2 && (m2 = m2.updateQueue, h = m2.lastBaseUpdate, h !== g && (null === h ? m2.firstBaseUpdate = l2 : h.next = l2, m2.lastBaseUpdate = k2));
  }
  if (null !== f2) {
    var q2 = e.baseState;
    g = 0;
    m2 = l2 = k2 = null;
    h = f2;
    do {
      var r2 = h.lane, y2 = h.eventTime;
      if ((d & r2) === r2) {
        null !== m2 && (m2 = m2.next = {
          eventTime: y2,
          lane: 0,
          tag: h.tag,
          payload: h.payload,
          callback: h.callback,
          next: null
        });
        a: {
          var n2 = a, t2 = h;
          r2 = b;
          y2 = c;
          switch (t2.tag) {
            case 1:
              n2 = t2.payload;
              if ("function" === typeof n2) {
                q2 = n2.call(y2, q2, r2);
                break a;
              }
              q2 = n2;
              break a;
            case 3:
              n2.flags = n2.flags & -65537 | 128;
            case 0:
              n2 = t2.payload;
              r2 = "function" === typeof n2 ? n2.call(y2, q2, r2) : n2;
              if (null === r2 || void 0 === r2) break a;
              q2 = A({}, q2, r2);
              break a;
            case 2:
              jh = true;
          }
        }
        null !== h.callback && 0 !== h.lane && (a.flags |= 64, r2 = e.effects, null === r2 ? e.effects = [h] : r2.push(h));
      } else y2 = { eventTime: y2, lane: r2, tag: h.tag, payload: h.payload, callback: h.callback, next: null }, null === m2 ? (l2 = m2 = y2, k2 = q2) : m2 = m2.next = y2, g |= r2;
      h = h.next;
      if (null === h) if (h = e.shared.pending, null === h) break;
      else r2 = h, h = r2.next, r2.next = null, e.lastBaseUpdate = r2, e.shared.pending = null;
    } while (1);
    null === m2 && (k2 = q2);
    e.baseState = k2;
    e.firstBaseUpdate = l2;
    e.lastBaseUpdate = m2;
    b = e.shared.interleaved;
    if (null !== b) {
      e = b;
      do
        g |= e.lane, e = e.next;
      while (e !== b);
    } else null === f2 && (e.shared.lanes = 0);
    rh |= g;
    a.lanes = g;
    a.memoizedState = q2;
  }
}
function sh(a, b, c) {
  a = b.effects;
  b.effects = null;
  if (null !== a) for (b = 0; b < a.length; b++) {
    var d = a[b], e = d.callback;
    if (null !== e) {
      d.callback = null;
      d = c;
      if ("function" !== typeof e) throw Error(p(191, e));
      e.call(d);
    }
  }
}
var th = {}, uh = Uf(th), vh = Uf(th), wh = Uf(th);
function xh(a) {
  if (a === th) throw Error(p(174));
  return a;
}
function yh(a, b) {
  G(wh, b);
  G(vh, a);
  G(uh, th);
  a = b.nodeType;
  switch (a) {
    case 9:
    case 11:
      b = (b = b.documentElement) ? b.namespaceURI : lb(null, "");
      break;
    default:
      a = 8 === a ? b.parentNode : b, b = a.namespaceURI || null, a = a.tagName, b = lb(b, a);
  }
  E(uh);
  G(uh, b);
}
function zh() {
  E(uh);
  E(vh);
  E(wh);
}
function Ah(a) {
  xh(wh.current);
  var b = xh(uh.current);
  var c = lb(b, a.type);
  b !== c && (G(vh, a), G(uh, c));
}
function Bh(a) {
  vh.current === a && (E(uh), E(vh));
}
var L = Uf(0);
function Ch(a) {
  for (var b = a; null !== b; ) {
    if (13 === b.tag) {
      var c = b.memoizedState;
      if (null !== c && (c = c.dehydrated, null === c || "$?" === c.data || "$!" === c.data)) return b;
    } else if (19 === b.tag && void 0 !== b.memoizedProps.revealOrder) {
      if (0 !== (b.flags & 128)) return b;
    } else if (null !== b.child) {
      b.child.return = b;
      b = b.child;
      continue;
    }
    if (b === a) break;
    for (; null === b.sibling; ) {
      if (null === b.return || b.return === a) return null;
      b = b.return;
    }
    b.sibling.return = b.return;
    b = b.sibling;
  }
  return null;
}
var Dh = [];
function Eh() {
  for (var a = 0; a < Dh.length; a++) Dh[a]._workInProgressVersionPrimary = null;
  Dh.length = 0;
}
var Fh = ua.ReactCurrentDispatcher, Gh = ua.ReactCurrentBatchConfig, Hh = 0, M = null, N = null, O = null, Ih = false, Jh = false, Kh = 0, Lh = 0;
function P() {
  throw Error(p(321));
}
function Mh(a, b) {
  if (null === b) return false;
  for (var c = 0; c < b.length && c < a.length; c++) if (!He(a[c], b[c])) return false;
  return true;
}
function Nh(a, b, c, d, e, f2) {
  Hh = f2;
  M = b;
  b.memoizedState = null;
  b.updateQueue = null;
  b.lanes = 0;
  Fh.current = null === a || null === a.memoizedState ? Oh : Ph;
  a = c(d, e);
  if (Jh) {
    f2 = 0;
    do {
      Jh = false;
      Kh = 0;
      if (25 <= f2) throw Error(p(301));
      f2 += 1;
      O = N = null;
      b.updateQueue = null;
      Fh.current = Qh;
      a = c(d, e);
    } while (Jh);
  }
  Fh.current = Rh;
  b = null !== N && null !== N.next;
  Hh = 0;
  O = N = M = null;
  Ih = false;
  if (b) throw Error(p(300));
  return a;
}
function Sh() {
  var a = 0 !== Kh;
  Kh = 0;
  return a;
}
function Th() {
  var a = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
  null === O ? M.memoizedState = O = a : O = O.next = a;
  return O;
}
function Uh() {
  if (null === N) {
    var a = M.alternate;
    a = null !== a ? a.memoizedState : null;
  } else a = N.next;
  var b = null === O ? M.memoizedState : O.next;
  if (null !== b) O = b, N = a;
  else {
    if (null === a) throw Error(p(310));
    N = a;
    a = { memoizedState: N.memoizedState, baseState: N.baseState, baseQueue: N.baseQueue, queue: N.queue, next: null };
    null === O ? M.memoizedState = O = a : O = O.next = a;
  }
  return O;
}
function Vh(a, b) {
  return "function" === typeof b ? b(a) : b;
}
function Wh(a) {
  var b = Uh(), c = b.queue;
  if (null === c) throw Error(p(311));
  c.lastRenderedReducer = a;
  var d = N, e = d.baseQueue, f2 = c.pending;
  if (null !== f2) {
    if (null !== e) {
      var g = e.next;
      e.next = f2.next;
      f2.next = g;
    }
    d.baseQueue = e = f2;
    c.pending = null;
  }
  if (null !== e) {
    f2 = e.next;
    d = d.baseState;
    var h = g = null, k2 = null, l2 = f2;
    do {
      var m2 = l2.lane;
      if ((Hh & m2) === m2) null !== k2 && (k2 = k2.next = { lane: 0, action: l2.action, hasEagerState: l2.hasEagerState, eagerState: l2.eagerState, next: null }), d = l2.hasEagerState ? l2.eagerState : a(d, l2.action);
      else {
        var q2 = {
          lane: m2,
          action: l2.action,
          hasEagerState: l2.hasEagerState,
          eagerState: l2.eagerState,
          next: null
        };
        null === k2 ? (h = k2 = q2, g = d) : k2 = k2.next = q2;
        M.lanes |= m2;
        rh |= m2;
      }
      l2 = l2.next;
    } while (null !== l2 && l2 !== f2);
    null === k2 ? g = d : k2.next = h;
    He(d, b.memoizedState) || (dh = true);
    b.memoizedState = d;
    b.baseState = g;
    b.baseQueue = k2;
    c.lastRenderedState = d;
  }
  a = c.interleaved;
  if (null !== a) {
    e = a;
    do
      f2 = e.lane, M.lanes |= f2, rh |= f2, e = e.next;
    while (e !== a);
  } else null === e && (c.lanes = 0);
  return [b.memoizedState, c.dispatch];
}
function Xh(a) {
  var b = Uh(), c = b.queue;
  if (null === c) throw Error(p(311));
  c.lastRenderedReducer = a;
  var d = c.dispatch, e = c.pending, f2 = b.memoizedState;
  if (null !== e) {
    c.pending = null;
    var g = e = e.next;
    do
      f2 = a(f2, g.action), g = g.next;
    while (g !== e);
    He(f2, b.memoizedState) || (dh = true);
    b.memoizedState = f2;
    null === b.baseQueue && (b.baseState = f2);
    c.lastRenderedState = f2;
  }
  return [f2, d];
}
function Yh() {
}
function Zh(a, b) {
  var c = M, d = Uh(), e = b(), f2 = !He(d.memoizedState, e);
  f2 && (d.memoizedState = e, dh = true);
  d = d.queue;
  $h(ai.bind(null, c, d, a), [a]);
  if (d.getSnapshot !== b || f2 || null !== O && O.memoizedState.tag & 1) {
    c.flags |= 2048;
    bi(9, ci.bind(null, c, d, e, b), void 0, null);
    if (null === Q) throw Error(p(349));
    0 !== (Hh & 30) || di(c, b, e);
  }
  return e;
}
function di(a, b, c) {
  a.flags |= 16384;
  a = { getSnapshot: b, value: c };
  b = M.updateQueue;
  null === b ? (b = { lastEffect: null, stores: null }, M.updateQueue = b, b.stores = [a]) : (c = b.stores, null === c ? b.stores = [a] : c.push(a));
}
function ci(a, b, c, d) {
  b.value = c;
  b.getSnapshot = d;
  ei(b) && fi(a);
}
function ai(a, b, c) {
  return c(function() {
    ei(b) && fi(a);
  });
}
function ei(a) {
  var b = a.getSnapshot;
  a = a.value;
  try {
    var c = b();
    return !He(a, c);
  } catch (d) {
    return true;
  }
}
function fi(a) {
  var b = ih(a, 1);
  null !== b && gi(b, a, 1, -1);
}
function hi(a) {
  var b = Th();
  "function" === typeof a && (a = a());
  b.memoizedState = b.baseState = a;
  a = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: Vh, lastRenderedState: a };
  b.queue = a;
  a = a.dispatch = ii.bind(null, M, a);
  return [b.memoizedState, a];
}
function bi(a, b, c, d) {
  a = { tag: a, create: b, destroy: c, deps: d, next: null };
  b = M.updateQueue;
  null === b ? (b = { lastEffect: null, stores: null }, M.updateQueue = b, b.lastEffect = a.next = a) : (c = b.lastEffect, null === c ? b.lastEffect = a.next = a : (d = c.next, c.next = a, a.next = d, b.lastEffect = a));
  return a;
}
function ji() {
  return Uh().memoizedState;
}
function ki(a, b, c, d) {
  var e = Th();
  M.flags |= a;
  e.memoizedState = bi(1 | b, c, void 0, void 0 === d ? null : d);
}
function li(a, b, c, d) {
  var e = Uh();
  d = void 0 === d ? null : d;
  var f2 = void 0;
  if (null !== N) {
    var g = N.memoizedState;
    f2 = g.destroy;
    if (null !== d && Mh(d, g.deps)) {
      e.memoizedState = bi(b, c, f2, d);
      return;
    }
  }
  M.flags |= a;
  e.memoizedState = bi(1 | b, c, f2, d);
}
function mi(a, b) {
  return ki(8390656, 8, a, b);
}
function $h(a, b) {
  return li(2048, 8, a, b);
}
function ni(a, b) {
  return li(4, 2, a, b);
}
function oi(a, b) {
  return li(4, 4, a, b);
}
function pi(a, b) {
  if ("function" === typeof b) return a = a(), b(a), function() {
    b(null);
  };
  if (null !== b && void 0 !== b) return a = a(), b.current = a, function() {
    b.current = null;
  };
}
function qi(a, b, c) {
  c = null !== c && void 0 !== c ? c.concat([a]) : null;
  return li(4, 4, pi.bind(null, b, a), c);
}
function ri() {
}
function si(a, b) {
  var c = Uh();
  b = void 0 === b ? null : b;
  var d = c.memoizedState;
  if (null !== d && null !== b && Mh(b, d[1])) return d[0];
  c.memoizedState = [a, b];
  return a;
}
function ti(a, b) {
  var c = Uh();
  b = void 0 === b ? null : b;
  var d = c.memoizedState;
  if (null !== d && null !== b && Mh(b, d[1])) return d[0];
  a = a();
  c.memoizedState = [a, b];
  return a;
}
function ui(a, b, c) {
  if (0 === (Hh & 21)) return a.baseState && (a.baseState = false, dh = true), a.memoizedState = c;
  He(c, b) || (c = yc(), M.lanes |= c, rh |= c, a.baseState = true);
  return b;
}
function vi(a, b) {
  var c = C;
  C = 0 !== c && 4 > c ? c : 4;
  a(true);
  var d = Gh.transition;
  Gh.transition = {};
  try {
    a(false), b();
  } finally {
    C = c, Gh.transition = d;
  }
}
function wi() {
  return Uh().memoizedState;
}
function xi(a, b, c) {
  var d = yi(a);
  c = { lane: d, action: c, hasEagerState: false, eagerState: null, next: null };
  if (zi(a)) Ai(b, c);
  else if (c = hh(a, b, c, d), null !== c) {
    var e = R();
    gi(c, a, d, e);
    Bi(c, b, d);
  }
}
function ii(a, b, c) {
  var d = yi(a), e = { lane: d, action: c, hasEagerState: false, eagerState: null, next: null };
  if (zi(a)) Ai(b, e);
  else {
    var f2 = a.alternate;
    if (0 === a.lanes && (null === f2 || 0 === f2.lanes) && (f2 = b.lastRenderedReducer, null !== f2)) try {
      var g = b.lastRenderedState, h = f2(g, c);
      e.hasEagerState = true;
      e.eagerState = h;
      if (He(h, g)) {
        var k2 = b.interleaved;
        null === k2 ? (e.next = e, gh(b)) : (e.next = k2.next, k2.next = e);
        b.interleaved = e;
        return;
      }
    } catch (l2) {
    } finally {
    }
    c = hh(a, b, e, d);
    null !== c && (e = R(), gi(c, a, d, e), Bi(c, b, d));
  }
}
function zi(a) {
  var b = a.alternate;
  return a === M || null !== b && b === M;
}
function Ai(a, b) {
  Jh = Ih = true;
  var c = a.pending;
  null === c ? b.next = b : (b.next = c.next, c.next = b);
  a.pending = b;
}
function Bi(a, b, c) {
  if (0 !== (c & 4194240)) {
    var d = b.lanes;
    d &= a.pendingLanes;
    c |= d;
    b.lanes = c;
    Cc(a, c);
  }
}
var Rh = { readContext: eh, useCallback: P, useContext: P, useEffect: P, useImperativeHandle: P, useInsertionEffect: P, useLayoutEffect: P, useMemo: P, useReducer: P, useRef: P, useState: P, useDebugValue: P, useDeferredValue: P, useTransition: P, useMutableSource: P, useSyncExternalStore: P, useId: P, unstable_isNewReconciler: false }, Oh = { readContext: eh, useCallback: function(a, b) {
  Th().memoizedState = [a, void 0 === b ? null : b];
  return a;
}, useContext: eh, useEffect: mi, useImperativeHandle: function(a, b, c) {
  c = null !== c && void 0 !== c ? c.concat([a]) : null;
  return ki(
    4194308,
    4,
    pi.bind(null, b, a),
    c
  );
}, useLayoutEffect: function(a, b) {
  return ki(4194308, 4, a, b);
}, useInsertionEffect: function(a, b) {
  return ki(4, 2, a, b);
}, useMemo: function(a, b) {
  var c = Th();
  b = void 0 === b ? null : b;
  a = a();
  c.memoizedState = [a, b];
  return a;
}, useReducer: function(a, b, c) {
  var d = Th();
  b = void 0 !== c ? c(b) : b;
  d.memoizedState = d.baseState = b;
  a = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: a, lastRenderedState: b };
  d.queue = a;
  a = a.dispatch = xi.bind(null, M, a);
  return [d.memoizedState, a];
}, useRef: function(a) {
  var b = Th();
  a = { current: a };
  return b.memoizedState = a;
}, useState: hi, useDebugValue: ri, useDeferredValue: function(a) {
  return Th().memoizedState = a;
}, useTransition: function() {
  var a = hi(false), b = a[0];
  a = vi.bind(null, a[1]);
  Th().memoizedState = a;
  return [b, a];
}, useMutableSource: function() {
}, useSyncExternalStore: function(a, b, c) {
  var d = M, e = Th();
  if (I) {
    if (void 0 === c) throw Error(p(407));
    c = c();
  } else {
    c = b();
    if (null === Q) throw Error(p(349));
    0 !== (Hh & 30) || di(d, b, c);
  }
  e.memoizedState = c;
  var f2 = { value: c, getSnapshot: b };
  e.queue = f2;
  mi(ai.bind(
    null,
    d,
    f2,
    a
  ), [a]);
  d.flags |= 2048;
  bi(9, ci.bind(null, d, f2, c, b), void 0, null);
  return c;
}, useId: function() {
  var a = Th(), b = Q.identifierPrefix;
  if (I) {
    var c = sg;
    var d = rg;
    c = (d & ~(1 << 32 - oc(d) - 1)).toString(32) + c;
    b = ":" + b + "R" + c;
    c = Kh++;
    0 < c && (b += "H" + c.toString(32));
    b += ":";
  } else c = Lh++, b = ":" + b + "r" + c.toString(32) + ":";
  return a.memoizedState = b;
}, unstable_isNewReconciler: false }, Ph = {
  readContext: eh,
  useCallback: si,
  useContext: eh,
  useEffect: $h,
  useImperativeHandle: qi,
  useInsertionEffect: ni,
  useLayoutEffect: oi,
  useMemo: ti,
  useReducer: Wh,
  useRef: ji,
  useState: function() {
    return Wh(Vh);
  },
  useDebugValue: ri,
  useDeferredValue: function(a) {
    var b = Uh();
    return ui(b, N.memoizedState, a);
  },
  useTransition: function() {
    var a = Wh(Vh)[0], b = Uh().memoizedState;
    return [a, b];
  },
  useMutableSource: Yh,
  useSyncExternalStore: Zh,
  useId: wi,
  unstable_isNewReconciler: false
}, Qh = { readContext: eh, useCallback: si, useContext: eh, useEffect: $h, useImperativeHandle: qi, useInsertionEffect: ni, useLayoutEffect: oi, useMemo: ti, useReducer: Xh, useRef: ji, useState: function() {
  return Xh(Vh);
}, useDebugValue: ri, useDeferredValue: function(a) {
  var b = Uh();
  return null === N ? b.memoizedState = a : ui(b, N.memoizedState, a);
}, useTransition: function() {
  var a = Xh(Vh)[0], b = Uh().memoizedState;
  return [a, b];
}, useMutableSource: Yh, useSyncExternalStore: Zh, useId: wi, unstable_isNewReconciler: false };
function Ci(a, b) {
  if (a && a.defaultProps) {
    b = A({}, b);
    a = a.defaultProps;
    for (var c in a) void 0 === b[c] && (b[c] = a[c]);
    return b;
  }
  return b;
}
function Di(a, b, c, d) {
  b = a.memoizedState;
  c = c(d, b);
  c = null === c || void 0 === c ? b : A({}, b, c);
  a.memoizedState = c;
  0 === a.lanes && (a.updateQueue.baseState = c);
}
var Ei = { isMounted: function(a) {
  return (a = a._reactInternals) ? Vb(a) === a : false;
}, enqueueSetState: function(a, b, c) {
  a = a._reactInternals;
  var d = R(), e = yi(a), f2 = mh(d, e);
  f2.payload = b;
  void 0 !== c && null !== c && (f2.callback = c);
  b = nh(a, f2, e);
  null !== b && (gi(b, a, e, d), oh(b, a, e));
}, enqueueReplaceState: function(a, b, c) {
  a = a._reactInternals;
  var d = R(), e = yi(a), f2 = mh(d, e);
  f2.tag = 1;
  f2.payload = b;
  void 0 !== c && null !== c && (f2.callback = c);
  b = nh(a, f2, e);
  null !== b && (gi(b, a, e, d), oh(b, a, e));
}, enqueueForceUpdate: function(a, b) {
  a = a._reactInternals;
  var c = R(), d = yi(a), e = mh(c, d);
  e.tag = 2;
  void 0 !== b && null !== b && (e.callback = b);
  b = nh(a, e, d);
  null !== b && (gi(b, a, d, c), oh(b, a, d));
} };
function Fi(a, b, c, d, e, f2, g) {
  a = a.stateNode;
  return "function" === typeof a.shouldComponentUpdate ? a.shouldComponentUpdate(d, f2, g) : b.prototype && b.prototype.isPureReactComponent ? !Ie(c, d) || !Ie(e, f2) : true;
}
function Gi(a, b, c) {
  var d = false, e = Vf;
  var f2 = b.contextType;
  "object" === typeof f2 && null !== f2 ? f2 = eh(f2) : (e = Zf(b) ? Xf : H.current, d = b.contextTypes, f2 = (d = null !== d && void 0 !== d) ? Yf(a, e) : Vf);
  b = new b(c, f2);
  a.memoizedState = null !== b.state && void 0 !== b.state ? b.state : null;
  b.updater = Ei;
  a.stateNode = b;
  b._reactInternals = a;
  d && (a = a.stateNode, a.__reactInternalMemoizedUnmaskedChildContext = e, a.__reactInternalMemoizedMaskedChildContext = f2);
  return b;
}
function Hi(a, b, c, d) {
  a = b.state;
  "function" === typeof b.componentWillReceiveProps && b.componentWillReceiveProps(c, d);
  "function" === typeof b.UNSAFE_componentWillReceiveProps && b.UNSAFE_componentWillReceiveProps(c, d);
  b.state !== a && Ei.enqueueReplaceState(b, b.state, null);
}
function Ii(a, b, c, d) {
  var e = a.stateNode;
  e.props = c;
  e.state = a.memoizedState;
  e.refs = {};
  kh(a);
  var f2 = b.contextType;
  "object" === typeof f2 && null !== f2 ? e.context = eh(f2) : (f2 = Zf(b) ? Xf : H.current, e.context = Yf(a, f2));
  e.state = a.memoizedState;
  f2 = b.getDerivedStateFromProps;
  "function" === typeof f2 && (Di(a, b, f2, c), e.state = a.memoizedState);
  "function" === typeof b.getDerivedStateFromProps || "function" === typeof e.getSnapshotBeforeUpdate || "function" !== typeof e.UNSAFE_componentWillMount && "function" !== typeof e.componentWillMount || (b = e.state, "function" === typeof e.componentWillMount && e.componentWillMount(), "function" === typeof e.UNSAFE_componentWillMount && e.UNSAFE_componentWillMount(), b !== e.state && Ei.enqueueReplaceState(e, e.state, null), qh(a, c, e, d), e.state = a.memoizedState);
  "function" === typeof e.componentDidMount && (a.flags |= 4194308);
}
function Ji(a, b) {
  try {
    var c = "", d = b;
    do
      c += Pa(d), d = d.return;
    while (d);
    var e = c;
  } catch (f2) {
    e = "\nError generating stack: " + f2.message + "\n" + f2.stack;
  }
  return { value: a, source: b, stack: e, digest: null };
}
function Ki(a, b, c) {
  return { value: a, source: null, stack: null != c ? c : null, digest: null != b ? b : null };
}
function Li(a, b) {
  try {
    console.error(b.value);
  } catch (c) {
    setTimeout(function() {
      throw c;
    });
  }
}
var Mi = "function" === typeof WeakMap ? WeakMap : Map;
function Ni(a, b, c) {
  c = mh(-1, c);
  c.tag = 3;
  c.payload = { element: null };
  var d = b.value;
  c.callback = function() {
    Oi || (Oi = true, Pi = d);
    Li(a, b);
  };
  return c;
}
function Qi(a, b, c) {
  c = mh(-1, c);
  c.tag = 3;
  var d = a.type.getDerivedStateFromError;
  if ("function" === typeof d) {
    var e = b.value;
    c.payload = function() {
      return d(e);
    };
    c.callback = function() {
      Li(a, b);
    };
  }
  var f2 = a.stateNode;
  null !== f2 && "function" === typeof f2.componentDidCatch && (c.callback = function() {
    Li(a, b);
    "function" !== typeof d && (null === Ri ? Ri = /* @__PURE__ */ new Set([this]) : Ri.add(this));
    var c2 = b.stack;
    this.componentDidCatch(b.value, { componentStack: null !== c2 ? c2 : "" });
  });
  return c;
}
function Si(a, b, c) {
  var d = a.pingCache;
  if (null === d) {
    d = a.pingCache = new Mi();
    var e = /* @__PURE__ */ new Set();
    d.set(b, e);
  } else e = d.get(b), void 0 === e && (e = /* @__PURE__ */ new Set(), d.set(b, e));
  e.has(c) || (e.add(c), a = Ti.bind(null, a, b, c), b.then(a, a));
}
function Ui(a) {
  do {
    var b;
    if (b = 13 === a.tag) b = a.memoizedState, b = null !== b ? null !== b.dehydrated ? true : false : true;
    if (b) return a;
    a = a.return;
  } while (null !== a);
  return null;
}
function Vi(a, b, c, d, e) {
  if (0 === (a.mode & 1)) return a === b ? a.flags |= 65536 : (a.flags |= 128, c.flags |= 131072, c.flags &= -52805, 1 === c.tag && (null === c.alternate ? c.tag = 17 : (b = mh(-1, 1), b.tag = 2, nh(c, b, 1))), c.lanes |= 1), a;
  a.flags |= 65536;
  a.lanes = e;
  return a;
}
var Wi = ua.ReactCurrentOwner, dh = false;
function Xi(a, b, c, d) {
  b.child = null === a ? Vg(b, null, c, d) : Ug(b, a.child, c, d);
}
function Yi(a, b, c, d, e) {
  c = c.render;
  var f2 = b.ref;
  ch(b, e);
  d = Nh(a, b, c, d, f2, e);
  c = Sh();
  if (null !== a && !dh) return b.updateQueue = a.updateQueue, b.flags &= -2053, a.lanes &= ~e, Zi(a, b, e);
  I && c && vg(b);
  b.flags |= 1;
  Xi(a, b, d, e);
  return b.child;
}
function $i(a, b, c, d, e) {
  if (null === a) {
    var f2 = c.type;
    if ("function" === typeof f2 && !aj(f2) && void 0 === f2.defaultProps && null === c.compare && void 0 === c.defaultProps) return b.tag = 15, b.type = f2, bj(a, b, f2, d, e);
    a = Rg(c.type, null, d, b, b.mode, e);
    a.ref = b.ref;
    a.return = b;
    return b.child = a;
  }
  f2 = a.child;
  if (0 === (a.lanes & e)) {
    var g = f2.memoizedProps;
    c = c.compare;
    c = null !== c ? c : Ie;
    if (c(g, d) && a.ref === b.ref) return Zi(a, b, e);
  }
  b.flags |= 1;
  a = Pg(f2, d);
  a.ref = b.ref;
  a.return = b;
  return b.child = a;
}
function bj(a, b, c, d, e) {
  if (null !== a) {
    var f2 = a.memoizedProps;
    if (Ie(f2, d) && a.ref === b.ref) if (dh = false, b.pendingProps = d = f2, 0 !== (a.lanes & e)) 0 !== (a.flags & 131072) && (dh = true);
    else return b.lanes = a.lanes, Zi(a, b, e);
  }
  return cj(a, b, c, d, e);
}
function dj(a, b, c) {
  var d = b.pendingProps, e = d.children, f2 = null !== a ? a.memoizedState : null;
  if ("hidden" === d.mode) if (0 === (b.mode & 1)) b.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, G(ej, fj), fj |= c;
  else {
    if (0 === (c & 1073741824)) return a = null !== f2 ? f2.baseLanes | c : c, b.lanes = b.childLanes = 1073741824, b.memoizedState = { baseLanes: a, cachePool: null, transitions: null }, b.updateQueue = null, G(ej, fj), fj |= a, null;
    b.memoizedState = { baseLanes: 0, cachePool: null, transitions: null };
    d = null !== f2 ? f2.baseLanes : c;
    G(ej, fj);
    fj |= d;
  }
  else null !== f2 ? (d = f2.baseLanes | c, b.memoizedState = null) : d = c, G(ej, fj), fj |= d;
  Xi(a, b, e, c);
  return b.child;
}
function gj(a, b) {
  var c = b.ref;
  if (null === a && null !== c || null !== a && a.ref !== c) b.flags |= 512, b.flags |= 2097152;
}
function cj(a, b, c, d, e) {
  var f2 = Zf(c) ? Xf : H.current;
  f2 = Yf(b, f2);
  ch(b, e);
  c = Nh(a, b, c, d, f2, e);
  d = Sh();
  if (null !== a && !dh) return b.updateQueue = a.updateQueue, b.flags &= -2053, a.lanes &= ~e, Zi(a, b, e);
  I && d && vg(b);
  b.flags |= 1;
  Xi(a, b, c, e);
  return b.child;
}
function hj(a, b, c, d, e) {
  if (Zf(c)) {
    var f2 = true;
    cg(b);
  } else f2 = false;
  ch(b, e);
  if (null === b.stateNode) ij(a, b), Gi(b, c, d), Ii(b, c, d, e), d = true;
  else if (null === a) {
    var g = b.stateNode, h = b.memoizedProps;
    g.props = h;
    var k2 = g.context, l2 = c.contextType;
    "object" === typeof l2 && null !== l2 ? l2 = eh(l2) : (l2 = Zf(c) ? Xf : H.current, l2 = Yf(b, l2));
    var m2 = c.getDerivedStateFromProps, q2 = "function" === typeof m2 || "function" === typeof g.getSnapshotBeforeUpdate;
    q2 || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== d || k2 !== l2) && Hi(b, g, d, l2);
    jh = false;
    var r2 = b.memoizedState;
    g.state = r2;
    qh(b, d, g, e);
    k2 = b.memoizedState;
    h !== d || r2 !== k2 || Wf.current || jh ? ("function" === typeof m2 && (Di(b, c, m2, d), k2 = b.memoizedState), (h = jh || Fi(b, c, h, d, r2, k2, l2)) ? (q2 || "function" !== typeof g.UNSAFE_componentWillMount && "function" !== typeof g.componentWillMount || ("function" === typeof g.componentWillMount && g.componentWillMount(), "function" === typeof g.UNSAFE_componentWillMount && g.UNSAFE_componentWillMount()), "function" === typeof g.componentDidMount && (b.flags |= 4194308)) : ("function" === typeof g.componentDidMount && (b.flags |= 4194308), b.memoizedProps = d, b.memoizedState = k2), g.props = d, g.state = k2, g.context = l2, d = h) : ("function" === typeof g.componentDidMount && (b.flags |= 4194308), d = false);
  } else {
    g = b.stateNode;
    lh(a, b);
    h = b.memoizedProps;
    l2 = b.type === b.elementType ? h : Ci(b.type, h);
    g.props = l2;
    q2 = b.pendingProps;
    r2 = g.context;
    k2 = c.contextType;
    "object" === typeof k2 && null !== k2 ? k2 = eh(k2) : (k2 = Zf(c) ? Xf : H.current, k2 = Yf(b, k2));
    var y2 = c.getDerivedStateFromProps;
    (m2 = "function" === typeof y2 || "function" === typeof g.getSnapshotBeforeUpdate) || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== q2 || r2 !== k2) && Hi(b, g, d, k2);
    jh = false;
    r2 = b.memoizedState;
    g.state = r2;
    qh(b, d, g, e);
    var n2 = b.memoizedState;
    h !== q2 || r2 !== n2 || Wf.current || jh ? ("function" === typeof y2 && (Di(b, c, y2, d), n2 = b.memoizedState), (l2 = jh || Fi(b, c, l2, d, r2, n2, k2) || false) ? (m2 || "function" !== typeof g.UNSAFE_componentWillUpdate && "function" !== typeof g.componentWillUpdate || ("function" === typeof g.componentWillUpdate && g.componentWillUpdate(d, n2, k2), "function" === typeof g.UNSAFE_componentWillUpdate && g.UNSAFE_componentWillUpdate(d, n2, k2)), "function" === typeof g.componentDidUpdate && (b.flags |= 4), "function" === typeof g.getSnapshotBeforeUpdate && (b.flags |= 1024)) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && r2 === a.memoizedState || (b.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && r2 === a.memoizedState || (b.flags |= 1024), b.memoizedProps = d, b.memoizedState = n2), g.props = d, g.state = n2, g.context = k2, d = l2) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && r2 === a.memoizedState || (b.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && r2 === a.memoizedState || (b.flags |= 1024), d = false);
  }
  return jj(a, b, c, d, f2, e);
}
function jj(a, b, c, d, e, f2) {
  gj(a, b);
  var g = 0 !== (b.flags & 128);
  if (!d && !g) return e && dg(b, c, false), Zi(a, b, f2);
  d = b.stateNode;
  Wi.current = b;
  var h = g && "function" !== typeof c.getDerivedStateFromError ? null : d.render();
  b.flags |= 1;
  null !== a && g ? (b.child = Ug(b, a.child, null, f2), b.child = Ug(b, null, h, f2)) : Xi(a, b, h, f2);
  b.memoizedState = d.state;
  e && dg(b, c, true);
  return b.child;
}
function kj(a) {
  var b = a.stateNode;
  b.pendingContext ? ag(a, b.pendingContext, b.pendingContext !== b.context) : b.context && ag(a, b.context, false);
  yh(a, b.containerInfo);
}
function lj(a, b, c, d, e) {
  Ig();
  Jg(e);
  b.flags |= 256;
  Xi(a, b, c, d);
  return b.child;
}
var mj = { dehydrated: null, treeContext: null, retryLane: 0 };
function nj(a) {
  return { baseLanes: a, cachePool: null, transitions: null };
}
function oj(a, b, c) {
  var d = b.pendingProps, e = L.current, f2 = false, g = 0 !== (b.flags & 128), h;
  (h = g) || (h = null !== a && null === a.memoizedState ? false : 0 !== (e & 2));
  if (h) f2 = true, b.flags &= -129;
  else if (null === a || null !== a.memoizedState) e |= 1;
  G(L, e & 1);
  if (null === a) {
    Eg(b);
    a = b.memoizedState;
    if (null !== a && (a = a.dehydrated, null !== a)) return 0 === (b.mode & 1) ? b.lanes = 1 : "$!" === a.data ? b.lanes = 8 : b.lanes = 1073741824, null;
    g = d.children;
    a = d.fallback;
    return f2 ? (d = b.mode, f2 = b.child, g = { mode: "hidden", children: g }, 0 === (d & 1) && null !== f2 ? (f2.childLanes = 0, f2.pendingProps = g) : f2 = pj(g, d, 0, null), a = Tg(a, d, c, null), f2.return = b, a.return = b, f2.sibling = a, b.child = f2, b.child.memoizedState = nj(c), b.memoizedState = mj, a) : qj(b, g);
  }
  e = a.memoizedState;
  if (null !== e && (h = e.dehydrated, null !== h)) return rj(a, b, g, d, h, e, c);
  if (f2) {
    f2 = d.fallback;
    g = b.mode;
    e = a.child;
    h = e.sibling;
    var k2 = { mode: "hidden", children: d.children };
    0 === (g & 1) && b.child !== e ? (d = b.child, d.childLanes = 0, d.pendingProps = k2, b.deletions = null) : (d = Pg(e, k2), d.subtreeFlags = e.subtreeFlags & 14680064);
    null !== h ? f2 = Pg(h, f2) : (f2 = Tg(f2, g, c, null), f2.flags |= 2);
    f2.return = b;
    d.return = b;
    d.sibling = f2;
    b.child = d;
    d = f2;
    f2 = b.child;
    g = a.child.memoizedState;
    g = null === g ? nj(c) : { baseLanes: g.baseLanes | c, cachePool: null, transitions: g.transitions };
    f2.memoizedState = g;
    f2.childLanes = a.childLanes & ~c;
    b.memoizedState = mj;
    return d;
  }
  f2 = a.child;
  a = f2.sibling;
  d = Pg(f2, { mode: "visible", children: d.children });
  0 === (b.mode & 1) && (d.lanes = c);
  d.return = b;
  d.sibling = null;
  null !== a && (c = b.deletions, null === c ? (b.deletions = [a], b.flags |= 16) : c.push(a));
  b.child = d;
  b.memoizedState = null;
  return d;
}
function qj(a, b) {
  b = pj({ mode: "visible", children: b }, a.mode, 0, null);
  b.return = a;
  return a.child = b;
}
function sj(a, b, c, d) {
  null !== d && Jg(d);
  Ug(b, a.child, null, c);
  a = qj(b, b.pendingProps.children);
  a.flags |= 2;
  b.memoizedState = null;
  return a;
}
function rj(a, b, c, d, e, f2, g) {
  if (c) {
    if (b.flags & 256) return b.flags &= -257, d = Ki(Error(p(422))), sj(a, b, g, d);
    if (null !== b.memoizedState) return b.child = a.child, b.flags |= 128, null;
    f2 = d.fallback;
    e = b.mode;
    d = pj({ mode: "visible", children: d.children }, e, 0, null);
    f2 = Tg(f2, e, g, null);
    f2.flags |= 2;
    d.return = b;
    f2.return = b;
    d.sibling = f2;
    b.child = d;
    0 !== (b.mode & 1) && Ug(b, a.child, null, g);
    b.child.memoizedState = nj(g);
    b.memoizedState = mj;
    return f2;
  }
  if (0 === (b.mode & 1)) return sj(a, b, g, null);
  if ("$!" === e.data) {
    d = e.nextSibling && e.nextSibling.dataset;
    if (d) var h = d.dgst;
    d = h;
    f2 = Error(p(419));
    d = Ki(f2, d, void 0);
    return sj(a, b, g, d);
  }
  h = 0 !== (g & a.childLanes);
  if (dh || h) {
    d = Q;
    if (null !== d) {
      switch (g & -g) {
        case 4:
          e = 2;
          break;
        case 16:
          e = 8;
          break;
        case 64:
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
        case 67108864:
          e = 32;
          break;
        case 536870912:
          e = 268435456;
          break;
        default:
          e = 0;
      }
      e = 0 !== (e & (d.suspendedLanes | g)) ? 0 : e;
      0 !== e && e !== f2.retryLane && (f2.retryLane = e, ih(a, e), gi(d, a, e, -1));
    }
    tj();
    d = Ki(Error(p(421)));
    return sj(a, b, g, d);
  }
  if ("$?" === e.data) return b.flags |= 128, b.child = a.child, b = uj.bind(null, a), e._reactRetry = b, null;
  a = f2.treeContext;
  yg = Lf(e.nextSibling);
  xg = b;
  I = true;
  zg = null;
  null !== a && (og[pg++] = rg, og[pg++] = sg, og[pg++] = qg, rg = a.id, sg = a.overflow, qg = b);
  b = qj(b, d.children);
  b.flags |= 4096;
  return b;
}
function vj(a, b, c) {
  a.lanes |= b;
  var d = a.alternate;
  null !== d && (d.lanes |= b);
  bh(a.return, b, c);
}
function wj(a, b, c, d, e) {
  var f2 = a.memoizedState;
  null === f2 ? a.memoizedState = { isBackwards: b, rendering: null, renderingStartTime: 0, last: d, tail: c, tailMode: e } : (f2.isBackwards = b, f2.rendering = null, f2.renderingStartTime = 0, f2.last = d, f2.tail = c, f2.tailMode = e);
}
function xj(a, b, c) {
  var d = b.pendingProps, e = d.revealOrder, f2 = d.tail;
  Xi(a, b, d.children, c);
  d = L.current;
  if (0 !== (d & 2)) d = d & 1 | 2, b.flags |= 128;
  else {
    if (null !== a && 0 !== (a.flags & 128)) a: for (a = b.child; null !== a; ) {
      if (13 === a.tag) null !== a.memoizedState && vj(a, c, b);
      else if (19 === a.tag) vj(a, c, b);
      else if (null !== a.child) {
        a.child.return = a;
        a = a.child;
        continue;
      }
      if (a === b) break a;
      for (; null === a.sibling; ) {
        if (null === a.return || a.return === b) break a;
        a = a.return;
      }
      a.sibling.return = a.return;
      a = a.sibling;
    }
    d &= 1;
  }
  G(L, d);
  if (0 === (b.mode & 1)) b.memoizedState = null;
  else switch (e) {
    case "forwards":
      c = b.child;
      for (e = null; null !== c; ) a = c.alternate, null !== a && null === Ch(a) && (e = c), c = c.sibling;
      c = e;
      null === c ? (e = b.child, b.child = null) : (e = c.sibling, c.sibling = null);
      wj(b, false, e, c, f2);
      break;
    case "backwards":
      c = null;
      e = b.child;
      for (b.child = null; null !== e; ) {
        a = e.alternate;
        if (null !== a && null === Ch(a)) {
          b.child = e;
          break;
        }
        a = e.sibling;
        e.sibling = c;
        c = e;
        e = a;
      }
      wj(b, true, c, null, f2);
      break;
    case "together":
      wj(b, false, null, null, void 0);
      break;
    default:
      b.memoizedState = null;
  }
  return b.child;
}
function ij(a, b) {
  0 === (b.mode & 1) && null !== a && (a.alternate = null, b.alternate = null, b.flags |= 2);
}
function Zi(a, b, c) {
  null !== a && (b.dependencies = a.dependencies);
  rh |= b.lanes;
  if (0 === (c & b.childLanes)) return null;
  if (null !== a && b.child !== a.child) throw Error(p(153));
  if (null !== b.child) {
    a = b.child;
    c = Pg(a, a.pendingProps);
    b.child = c;
    for (c.return = b; null !== a.sibling; ) a = a.sibling, c = c.sibling = Pg(a, a.pendingProps), c.return = b;
    c.sibling = null;
  }
  return b.child;
}
function yj(a, b, c) {
  switch (b.tag) {
    case 3:
      kj(b);
      Ig();
      break;
    case 5:
      Ah(b);
      break;
    case 1:
      Zf(b.type) && cg(b);
      break;
    case 4:
      yh(b, b.stateNode.containerInfo);
      break;
    case 10:
      var d = b.type._context, e = b.memoizedProps.value;
      G(Wg, d._currentValue);
      d._currentValue = e;
      break;
    case 13:
      d = b.memoizedState;
      if (null !== d) {
        if (null !== d.dehydrated) return G(L, L.current & 1), b.flags |= 128, null;
        if (0 !== (c & b.child.childLanes)) return oj(a, b, c);
        G(L, L.current & 1);
        a = Zi(a, b, c);
        return null !== a ? a.sibling : null;
      }
      G(L, L.current & 1);
      break;
    case 19:
      d = 0 !== (c & b.childLanes);
      if (0 !== (a.flags & 128)) {
        if (d) return xj(a, b, c);
        b.flags |= 128;
      }
      e = b.memoizedState;
      null !== e && (e.rendering = null, e.tail = null, e.lastEffect = null);
      G(L, L.current);
      if (d) break;
      else return null;
    case 22:
    case 23:
      return b.lanes = 0, dj(a, b, c);
  }
  return Zi(a, b, c);
}
var zj, Aj, Bj, Cj;
zj = function(a, b) {
  for (var c = b.child; null !== c; ) {
    if (5 === c.tag || 6 === c.tag) a.appendChild(c.stateNode);
    else if (4 !== c.tag && null !== c.child) {
      c.child.return = c;
      c = c.child;
      continue;
    }
    if (c === b) break;
    for (; null === c.sibling; ) {
      if (null === c.return || c.return === b) return;
      c = c.return;
    }
    c.sibling.return = c.return;
    c = c.sibling;
  }
};
Aj = function() {
};
Bj = function(a, b, c, d) {
  var e = a.memoizedProps;
  if (e !== d) {
    a = b.stateNode;
    xh(uh.current);
    var f2 = null;
    switch (c) {
      case "input":
        e = Ya(a, e);
        d = Ya(a, d);
        f2 = [];
        break;
      case "select":
        e = A({}, e, { value: void 0 });
        d = A({}, d, { value: void 0 });
        f2 = [];
        break;
      case "textarea":
        e = gb(a, e);
        d = gb(a, d);
        f2 = [];
        break;
      default:
        "function" !== typeof e.onClick && "function" === typeof d.onClick && (a.onclick = Bf);
    }
    ub(c, d);
    var g;
    c = null;
    for (l2 in e) if (!d.hasOwnProperty(l2) && e.hasOwnProperty(l2) && null != e[l2]) if ("style" === l2) {
      var h = e[l2];
      for (g in h) h.hasOwnProperty(g) && (c || (c = {}), c[g] = "");
    } else "dangerouslySetInnerHTML" !== l2 && "children" !== l2 && "suppressContentEditableWarning" !== l2 && "suppressHydrationWarning" !== l2 && "autoFocus" !== l2 && (ea.hasOwnProperty(l2) ? f2 || (f2 = []) : (f2 = f2 || []).push(l2, null));
    for (l2 in d) {
      var k2 = d[l2];
      h = null != e ? e[l2] : void 0;
      if (d.hasOwnProperty(l2) && k2 !== h && (null != k2 || null != h)) if ("style" === l2) if (h) {
        for (g in h) !h.hasOwnProperty(g) || k2 && k2.hasOwnProperty(g) || (c || (c = {}), c[g] = "");
        for (g in k2) k2.hasOwnProperty(g) && h[g] !== k2[g] && (c || (c = {}), c[g] = k2[g]);
      } else c || (f2 || (f2 = []), f2.push(
        l2,
        c
      )), c = k2;
      else "dangerouslySetInnerHTML" === l2 ? (k2 = k2 ? k2.__html : void 0, h = h ? h.__html : void 0, null != k2 && h !== k2 && (f2 = f2 || []).push(l2, k2)) : "children" === l2 ? "string" !== typeof k2 && "number" !== typeof k2 || (f2 = f2 || []).push(l2, "" + k2) : "suppressContentEditableWarning" !== l2 && "suppressHydrationWarning" !== l2 && (ea.hasOwnProperty(l2) ? (null != k2 && "onScroll" === l2 && D("scroll", a), f2 || h === k2 || (f2 = [])) : (f2 = f2 || []).push(l2, k2));
    }
    c && (f2 = f2 || []).push("style", c);
    var l2 = f2;
    if (b.updateQueue = l2) b.flags |= 4;
  }
};
Cj = function(a, b, c, d) {
  c !== d && (b.flags |= 4);
};
function Dj(a, b) {
  if (!I) switch (a.tailMode) {
    case "hidden":
      b = a.tail;
      for (var c = null; null !== b; ) null !== b.alternate && (c = b), b = b.sibling;
      null === c ? a.tail = null : c.sibling = null;
      break;
    case "collapsed":
      c = a.tail;
      for (var d = null; null !== c; ) null !== c.alternate && (d = c), c = c.sibling;
      null === d ? b || null === a.tail ? a.tail = null : a.tail.sibling = null : d.sibling = null;
  }
}
function S(a) {
  var b = null !== a.alternate && a.alternate.child === a.child, c = 0, d = 0;
  if (b) for (var e = a.child; null !== e; ) c |= e.lanes | e.childLanes, d |= e.subtreeFlags & 14680064, d |= e.flags & 14680064, e.return = a, e = e.sibling;
  else for (e = a.child; null !== e; ) c |= e.lanes | e.childLanes, d |= e.subtreeFlags, d |= e.flags, e.return = a, e = e.sibling;
  a.subtreeFlags |= d;
  a.childLanes = c;
  return b;
}
function Ej(a, b, c) {
  var d = b.pendingProps;
  wg(b);
  switch (b.tag) {
    case 2:
    case 16:
    case 15:
    case 0:
    case 11:
    case 7:
    case 8:
    case 12:
    case 9:
    case 14:
      return S(b), null;
    case 1:
      return Zf(b.type) && $f(), S(b), null;
    case 3:
      d = b.stateNode;
      zh();
      E(Wf);
      E(H);
      Eh();
      d.pendingContext && (d.context = d.pendingContext, d.pendingContext = null);
      if (null === a || null === a.child) Gg(b) ? b.flags |= 4 : null === a || a.memoizedState.isDehydrated && 0 === (b.flags & 256) || (b.flags |= 1024, null !== zg && (Fj(zg), zg = null));
      Aj(a, b);
      S(b);
      return null;
    case 5:
      Bh(b);
      var e = xh(wh.current);
      c = b.type;
      if (null !== a && null != b.stateNode) Bj(a, b, c, d, e), a.ref !== b.ref && (b.flags |= 512, b.flags |= 2097152);
      else {
        if (!d) {
          if (null === b.stateNode) throw Error(p(166));
          S(b);
          return null;
        }
        a = xh(uh.current);
        if (Gg(b)) {
          d = b.stateNode;
          c = b.type;
          var f2 = b.memoizedProps;
          d[Of] = b;
          d[Pf] = f2;
          a = 0 !== (b.mode & 1);
          switch (c) {
            case "dialog":
              D("cancel", d);
              D("close", d);
              break;
            case "iframe":
            case "object":
            case "embed":
              D("load", d);
              break;
            case "video":
            case "audio":
              for (e = 0; e < lf.length; e++) D(lf[e], d);
              break;
            case "source":
              D("error", d);
              break;
            case "img":
            case "image":
            case "link":
              D(
                "error",
                d
              );
              D("load", d);
              break;
            case "details":
              D("toggle", d);
              break;
            case "input":
              Za(d, f2);
              D("invalid", d);
              break;
            case "select":
              d._wrapperState = { wasMultiple: !!f2.multiple };
              D("invalid", d);
              break;
            case "textarea":
              hb(d, f2), D("invalid", d);
          }
          ub(c, f2);
          e = null;
          for (var g in f2) if (f2.hasOwnProperty(g)) {
            var h = f2[g];
            "children" === g ? "string" === typeof h ? d.textContent !== h && (true !== f2.suppressHydrationWarning && Af(d.textContent, h, a), e = ["children", h]) : "number" === typeof h && d.textContent !== "" + h && (true !== f2.suppressHydrationWarning && Af(
              d.textContent,
              h,
              a
            ), e = ["children", "" + h]) : ea.hasOwnProperty(g) && null != h && "onScroll" === g && D("scroll", d);
          }
          switch (c) {
            case "input":
              Va(d);
              db(d, f2, true);
              break;
            case "textarea":
              Va(d);
              jb(d);
              break;
            case "select":
            case "option":
              break;
            default:
              "function" === typeof f2.onClick && (d.onclick = Bf);
          }
          d = e;
          b.updateQueue = d;
          null !== d && (b.flags |= 4);
        } else {
          g = 9 === e.nodeType ? e : e.ownerDocument;
          "http://www.w3.org/1999/xhtml" === a && (a = kb(c));
          "http://www.w3.org/1999/xhtml" === a ? "script" === c ? (a = g.createElement("div"), a.innerHTML = "<script><\/script>", a = a.removeChild(a.firstChild)) : "string" === typeof d.is ? a = g.createElement(c, { is: d.is }) : (a = g.createElement(c), "select" === c && (g = a, d.multiple ? g.multiple = true : d.size && (g.size = d.size))) : a = g.createElementNS(a, c);
          a[Of] = b;
          a[Pf] = d;
          zj(a, b, false, false);
          b.stateNode = a;
          a: {
            g = vb(c, d);
            switch (c) {
              case "dialog":
                D("cancel", a);
                D("close", a);
                e = d;
                break;
              case "iframe":
              case "object":
              case "embed":
                D("load", a);
                e = d;
                break;
              case "video":
              case "audio":
                for (e = 0; e < lf.length; e++) D(lf[e], a);
                e = d;
                break;
              case "source":
                D("error", a);
                e = d;
                break;
              case "img":
              case "image":
              case "link":
                D(
                  "error",
                  a
                );
                D("load", a);
                e = d;
                break;
              case "details":
                D("toggle", a);
                e = d;
                break;
              case "input":
                Za(a, d);
                e = Ya(a, d);
                D("invalid", a);
                break;
              case "option":
                e = d;
                break;
              case "select":
                a._wrapperState = { wasMultiple: !!d.multiple };
                e = A({}, d, { value: void 0 });
                D("invalid", a);
                break;
              case "textarea":
                hb(a, d);
                e = gb(a, d);
                D("invalid", a);
                break;
              default:
                e = d;
            }
            ub(c, e);
            h = e;
            for (f2 in h) if (h.hasOwnProperty(f2)) {
              var k2 = h[f2];
              "style" === f2 ? sb(a, k2) : "dangerouslySetInnerHTML" === f2 ? (k2 = k2 ? k2.__html : void 0, null != k2 && nb(a, k2)) : "children" === f2 ? "string" === typeof k2 ? ("textarea" !== c || "" !== k2) && ob(a, k2) : "number" === typeof k2 && ob(a, "" + k2) : "suppressContentEditableWarning" !== f2 && "suppressHydrationWarning" !== f2 && "autoFocus" !== f2 && (ea.hasOwnProperty(f2) ? null != k2 && "onScroll" === f2 && D("scroll", a) : null != k2 && ta(a, f2, k2, g));
            }
            switch (c) {
              case "input":
                Va(a);
                db(a, d, false);
                break;
              case "textarea":
                Va(a);
                jb(a);
                break;
              case "option":
                null != d.value && a.setAttribute("value", "" + Sa(d.value));
                break;
              case "select":
                a.multiple = !!d.multiple;
                f2 = d.value;
                null != f2 ? fb(a, !!d.multiple, f2, false) : null != d.defaultValue && fb(
                  a,
                  !!d.multiple,
                  d.defaultValue,
                  true
                );
                break;
              default:
                "function" === typeof e.onClick && (a.onclick = Bf);
            }
            switch (c) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                d = !!d.autoFocus;
                break a;
              case "img":
                d = true;
                break a;
              default:
                d = false;
            }
          }
          d && (b.flags |= 4);
        }
        null !== b.ref && (b.flags |= 512, b.flags |= 2097152);
      }
      S(b);
      return null;
    case 6:
      if (a && null != b.stateNode) Cj(a, b, a.memoizedProps, d);
      else {
        if ("string" !== typeof d && null === b.stateNode) throw Error(p(166));
        c = xh(wh.current);
        xh(uh.current);
        if (Gg(b)) {
          d = b.stateNode;
          c = b.memoizedProps;
          d[Of] = b;
          if (f2 = d.nodeValue !== c) {
            if (a = xg, null !== a) switch (a.tag) {
              case 3:
                Af(d.nodeValue, c, 0 !== (a.mode & 1));
                break;
              case 5:
                true !== a.memoizedProps.suppressHydrationWarning && Af(d.nodeValue, c, 0 !== (a.mode & 1));
            }
          }
          f2 && (b.flags |= 4);
        } else d = (9 === c.nodeType ? c : c.ownerDocument).createTextNode(d), d[Of] = b, b.stateNode = d;
      }
      S(b);
      return null;
    case 13:
      E(L);
      d = b.memoizedState;
      if (null === a || null !== a.memoizedState && null !== a.memoizedState.dehydrated) {
        if (I && null !== yg && 0 !== (b.mode & 1) && 0 === (b.flags & 128)) Hg(), Ig(), b.flags |= 98560, f2 = false;
        else if (f2 = Gg(b), null !== d && null !== d.dehydrated) {
          if (null === a) {
            if (!f2) throw Error(p(318));
            f2 = b.memoizedState;
            f2 = null !== f2 ? f2.dehydrated : null;
            if (!f2) throw Error(p(317));
            f2[Of] = b;
          } else Ig(), 0 === (b.flags & 128) && (b.memoizedState = null), b.flags |= 4;
          S(b);
          f2 = false;
        } else null !== zg && (Fj(zg), zg = null), f2 = true;
        if (!f2) return b.flags & 65536 ? b : null;
      }
      if (0 !== (b.flags & 128)) return b.lanes = c, b;
      d = null !== d;
      d !== (null !== a && null !== a.memoizedState) && d && (b.child.flags |= 8192, 0 !== (b.mode & 1) && (null === a || 0 !== (L.current & 1) ? 0 === T && (T = 3) : tj()));
      null !== b.updateQueue && (b.flags |= 4);
      S(b);
      return null;
    case 4:
      return zh(), Aj(a, b), null === a && sf(b.stateNode.containerInfo), S(b), null;
    case 10:
      return ah(b.type._context), S(b), null;
    case 17:
      return Zf(b.type) && $f(), S(b), null;
    case 19:
      E(L);
      f2 = b.memoizedState;
      if (null === f2) return S(b), null;
      d = 0 !== (b.flags & 128);
      g = f2.rendering;
      if (null === g) if (d) Dj(f2, false);
      else {
        if (0 !== T || null !== a && 0 !== (a.flags & 128)) for (a = b.child; null !== a; ) {
          g = Ch(a);
          if (null !== g) {
            b.flags |= 128;
            Dj(f2, false);
            d = g.updateQueue;
            null !== d && (b.updateQueue = d, b.flags |= 4);
            b.subtreeFlags = 0;
            d = c;
            for (c = b.child; null !== c; ) f2 = c, a = d, f2.flags &= 14680066, g = f2.alternate, null === g ? (f2.childLanes = 0, f2.lanes = a, f2.child = null, f2.subtreeFlags = 0, f2.memoizedProps = null, f2.memoizedState = null, f2.updateQueue = null, f2.dependencies = null, f2.stateNode = null) : (f2.childLanes = g.childLanes, f2.lanes = g.lanes, f2.child = g.child, f2.subtreeFlags = 0, f2.deletions = null, f2.memoizedProps = g.memoizedProps, f2.memoizedState = g.memoizedState, f2.updateQueue = g.updateQueue, f2.type = g.type, a = g.dependencies, f2.dependencies = null === a ? null : { lanes: a.lanes, firstContext: a.firstContext }), c = c.sibling;
            G(L, L.current & 1 | 2);
            return b.child;
          }
          a = a.sibling;
        }
        null !== f2.tail && B() > Gj && (b.flags |= 128, d = true, Dj(f2, false), b.lanes = 4194304);
      }
      else {
        if (!d) if (a = Ch(g), null !== a) {
          if (b.flags |= 128, d = true, c = a.updateQueue, null !== c && (b.updateQueue = c, b.flags |= 4), Dj(f2, true), null === f2.tail && "hidden" === f2.tailMode && !g.alternate && !I) return S(b), null;
        } else 2 * B() - f2.renderingStartTime > Gj && 1073741824 !== c && (b.flags |= 128, d = true, Dj(f2, false), b.lanes = 4194304);
        f2.isBackwards ? (g.sibling = b.child, b.child = g) : (c = f2.last, null !== c ? c.sibling = g : b.child = g, f2.last = g);
      }
      if (null !== f2.tail) return b = f2.tail, f2.rendering = b, f2.tail = b.sibling, f2.renderingStartTime = B(), b.sibling = null, c = L.current, G(L, d ? c & 1 | 2 : c & 1), b;
      S(b);
      return null;
    case 22:
    case 23:
      return Hj(), d = null !== b.memoizedState, null !== a && null !== a.memoizedState !== d && (b.flags |= 8192), d && 0 !== (b.mode & 1) ? 0 !== (fj & 1073741824) && (S(b), b.subtreeFlags & 6 && (b.flags |= 8192)) : S(b), null;
    case 24:
      return null;
    case 25:
      return null;
  }
  throw Error(p(156, b.tag));
}
function Ij(a, b) {
  wg(b);
  switch (b.tag) {
    case 1:
      return Zf(b.type) && $f(), a = b.flags, a & 65536 ? (b.flags = a & -65537 | 128, b) : null;
    case 3:
      return zh(), E(Wf), E(H), Eh(), a = b.flags, 0 !== (a & 65536) && 0 === (a & 128) ? (b.flags = a & -65537 | 128, b) : null;
    case 5:
      return Bh(b), null;
    case 13:
      E(L);
      a = b.memoizedState;
      if (null !== a && null !== a.dehydrated) {
        if (null === b.alternate) throw Error(p(340));
        Ig();
      }
      a = b.flags;
      return a & 65536 ? (b.flags = a & -65537 | 128, b) : null;
    case 19:
      return E(L), null;
    case 4:
      return zh(), null;
    case 10:
      return ah(b.type._context), null;
    case 22:
    case 23:
      return Hj(), null;
    case 24:
      return null;
    default:
      return null;
  }
}
var Jj = false, U = false, Kj = "function" === typeof WeakSet ? WeakSet : Set, V = null;
function Lj(a, b) {
  var c = a.ref;
  if (null !== c) if ("function" === typeof c) try {
    c(null);
  } catch (d) {
    W(a, b, d);
  }
  else c.current = null;
}
function Mj(a, b, c) {
  try {
    c();
  } catch (d) {
    W(a, b, d);
  }
}
var Nj = false;
function Oj(a, b) {
  Cf = dd;
  a = Me();
  if (Ne(a)) {
    if ("selectionStart" in a) var c = { start: a.selectionStart, end: a.selectionEnd };
    else a: {
      c = (c = a.ownerDocument) && c.defaultView || window;
      var d = c.getSelection && c.getSelection();
      if (d && 0 !== d.rangeCount) {
        c = d.anchorNode;
        var e = d.anchorOffset, f2 = d.focusNode;
        d = d.focusOffset;
        try {
          c.nodeType, f2.nodeType;
        } catch (F2) {
          c = null;
          break a;
        }
        var g = 0, h = -1, k2 = -1, l2 = 0, m2 = 0, q2 = a, r2 = null;
        b: for (; ; ) {
          for (var y2; ; ) {
            q2 !== c || 0 !== e && 3 !== q2.nodeType || (h = g + e);
            q2 !== f2 || 0 !== d && 3 !== q2.nodeType || (k2 = g + d);
            3 === q2.nodeType && (g += q2.nodeValue.length);
            if (null === (y2 = q2.firstChild)) break;
            r2 = q2;
            q2 = y2;
          }
          for (; ; ) {
            if (q2 === a) break b;
            r2 === c && ++l2 === e && (h = g);
            r2 === f2 && ++m2 === d && (k2 = g);
            if (null !== (y2 = q2.nextSibling)) break;
            q2 = r2;
            r2 = q2.parentNode;
          }
          q2 = y2;
        }
        c = -1 === h || -1 === k2 ? null : { start: h, end: k2 };
      } else c = null;
    }
    c = c || { start: 0, end: 0 };
  } else c = null;
  Df = { focusedElem: a, selectionRange: c };
  dd = false;
  for (V = b; null !== V; ) if (b = V, a = b.child, 0 !== (b.subtreeFlags & 1028) && null !== a) a.return = b, V = a;
  else for (; null !== V; ) {
    b = V;
    try {
      var n2 = b.alternate;
      if (0 !== (b.flags & 1024)) switch (b.tag) {
        case 0:
        case 11:
        case 15:
          break;
        case 1:
          if (null !== n2) {
            var t2 = n2.memoizedProps, J2 = n2.memoizedState, x2 = b.stateNode, w2 = x2.getSnapshotBeforeUpdate(b.elementType === b.type ? t2 : Ci(b.type, t2), J2);
            x2.__reactInternalSnapshotBeforeUpdate = w2;
          }
          break;
        case 3:
          var u2 = b.stateNode.containerInfo;
          1 === u2.nodeType ? u2.textContent = "" : 9 === u2.nodeType && u2.documentElement && u2.removeChild(u2.documentElement);
          break;
        case 5:
        case 6:
        case 4:
        case 17:
          break;
        default:
          throw Error(p(163));
      }
    } catch (F2) {
      W(b, b.return, F2);
    }
    a = b.sibling;
    if (null !== a) {
      a.return = b.return;
      V = a;
      break;
    }
    V = b.return;
  }
  n2 = Nj;
  Nj = false;
  return n2;
}
function Pj(a, b, c) {
  var d = b.updateQueue;
  d = null !== d ? d.lastEffect : null;
  if (null !== d) {
    var e = d = d.next;
    do {
      if ((e.tag & a) === a) {
        var f2 = e.destroy;
        e.destroy = void 0;
        void 0 !== f2 && Mj(b, c, f2);
      }
      e = e.next;
    } while (e !== d);
  }
}
function Qj(a, b) {
  b = b.updateQueue;
  b = null !== b ? b.lastEffect : null;
  if (null !== b) {
    var c = b = b.next;
    do {
      if ((c.tag & a) === a) {
        var d = c.create;
        c.destroy = d();
      }
      c = c.next;
    } while (c !== b);
  }
}
function Rj(a) {
  var b = a.ref;
  if (null !== b) {
    var c = a.stateNode;
    switch (a.tag) {
      case 5:
        a = c;
        break;
      default:
        a = c;
    }
    "function" === typeof b ? b(a) : b.current = a;
  }
}
function Sj(a) {
  var b = a.alternate;
  null !== b && (a.alternate = null, Sj(b));
  a.child = null;
  a.deletions = null;
  a.sibling = null;
  5 === a.tag && (b = a.stateNode, null !== b && (delete b[Of], delete b[Pf], delete b[of], delete b[Qf], delete b[Rf]));
  a.stateNode = null;
  a.return = null;
  a.dependencies = null;
  a.memoizedProps = null;
  a.memoizedState = null;
  a.pendingProps = null;
  a.stateNode = null;
  a.updateQueue = null;
}
function Tj(a) {
  return 5 === a.tag || 3 === a.tag || 4 === a.tag;
}
function Uj(a) {
  a: for (; ; ) {
    for (; null === a.sibling; ) {
      if (null === a.return || Tj(a.return)) return null;
      a = a.return;
    }
    a.sibling.return = a.return;
    for (a = a.sibling; 5 !== a.tag && 6 !== a.tag && 18 !== a.tag; ) {
      if (a.flags & 2) continue a;
      if (null === a.child || 4 === a.tag) continue a;
      else a.child.return = a, a = a.child;
    }
    if (!(a.flags & 2)) return a.stateNode;
  }
}
function Vj(a, b, c) {
  var d = a.tag;
  if (5 === d || 6 === d) a = a.stateNode, b ? 8 === c.nodeType ? c.parentNode.insertBefore(a, b) : c.insertBefore(a, b) : (8 === c.nodeType ? (b = c.parentNode, b.insertBefore(a, c)) : (b = c, b.appendChild(a)), c = c._reactRootContainer, null !== c && void 0 !== c || null !== b.onclick || (b.onclick = Bf));
  else if (4 !== d && (a = a.child, null !== a)) for (Vj(a, b, c), a = a.sibling; null !== a; ) Vj(a, b, c), a = a.sibling;
}
function Wj(a, b, c) {
  var d = a.tag;
  if (5 === d || 6 === d) a = a.stateNode, b ? c.insertBefore(a, b) : c.appendChild(a);
  else if (4 !== d && (a = a.child, null !== a)) for (Wj(a, b, c), a = a.sibling; null !== a; ) Wj(a, b, c), a = a.sibling;
}
var X = null, Xj = false;
function Yj(a, b, c) {
  for (c = c.child; null !== c; ) Zj(a, b, c), c = c.sibling;
}
function Zj(a, b, c) {
  if (lc && "function" === typeof lc.onCommitFiberUnmount) try {
    lc.onCommitFiberUnmount(kc, c);
  } catch (h) {
  }
  switch (c.tag) {
    case 5:
      U || Lj(c, b);
    case 6:
      var d = X, e = Xj;
      X = null;
      Yj(a, b, c);
      X = d;
      Xj = e;
      null !== X && (Xj ? (a = X, c = c.stateNode, 8 === a.nodeType ? a.parentNode.removeChild(c) : a.removeChild(c)) : X.removeChild(c.stateNode));
      break;
    case 18:
      null !== X && (Xj ? (a = X, c = c.stateNode, 8 === a.nodeType ? Kf(a.parentNode, c) : 1 === a.nodeType && Kf(a, c), bd(a)) : Kf(X, c.stateNode));
      break;
    case 4:
      d = X;
      e = Xj;
      X = c.stateNode.containerInfo;
      Xj = true;
      Yj(a, b, c);
      X = d;
      Xj = e;
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      if (!U && (d = c.updateQueue, null !== d && (d = d.lastEffect, null !== d))) {
        e = d = d.next;
        do {
          var f2 = e, g = f2.destroy;
          f2 = f2.tag;
          void 0 !== g && (0 !== (f2 & 2) ? Mj(c, b, g) : 0 !== (f2 & 4) && Mj(c, b, g));
          e = e.next;
        } while (e !== d);
      }
      Yj(a, b, c);
      break;
    case 1:
      if (!U && (Lj(c, b), d = c.stateNode, "function" === typeof d.componentWillUnmount)) try {
        d.props = c.memoizedProps, d.state = c.memoizedState, d.componentWillUnmount();
      } catch (h) {
        W(c, b, h);
      }
      Yj(a, b, c);
      break;
    case 21:
      Yj(a, b, c);
      break;
    case 22:
      c.mode & 1 ? (U = (d = U) || null !== c.memoizedState, Yj(a, b, c), U = d) : Yj(a, b, c);
      break;
    default:
      Yj(a, b, c);
  }
}
function ak(a) {
  var b = a.updateQueue;
  if (null !== b) {
    a.updateQueue = null;
    var c = a.stateNode;
    null === c && (c = a.stateNode = new Kj());
    b.forEach(function(b2) {
      var d = bk.bind(null, a, b2);
      c.has(b2) || (c.add(b2), b2.then(d, d));
    });
  }
}
function ck(a, b) {
  var c = b.deletions;
  if (null !== c) for (var d = 0; d < c.length; d++) {
    var e = c[d];
    try {
      var f2 = a, g = b, h = g;
      a: for (; null !== h; ) {
        switch (h.tag) {
          case 5:
            X = h.stateNode;
            Xj = false;
            break a;
          case 3:
            X = h.stateNode.containerInfo;
            Xj = true;
            break a;
          case 4:
            X = h.stateNode.containerInfo;
            Xj = true;
            break a;
        }
        h = h.return;
      }
      if (null === X) throw Error(p(160));
      Zj(f2, g, e);
      X = null;
      Xj = false;
      var k2 = e.alternate;
      null !== k2 && (k2.return = null);
      e.return = null;
    } catch (l2) {
      W(e, b, l2);
    }
  }
  if (b.subtreeFlags & 12854) for (b = b.child; null !== b; ) dk(b, a), b = b.sibling;
}
function dk(a, b) {
  var c = a.alternate, d = a.flags;
  switch (a.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      ck(b, a);
      ek(a);
      if (d & 4) {
        try {
          Pj(3, a, a.return), Qj(3, a);
        } catch (t2) {
          W(a, a.return, t2);
        }
        try {
          Pj(5, a, a.return);
        } catch (t2) {
          W(a, a.return, t2);
        }
      }
      break;
    case 1:
      ck(b, a);
      ek(a);
      d & 512 && null !== c && Lj(c, c.return);
      break;
    case 5:
      ck(b, a);
      ek(a);
      d & 512 && null !== c && Lj(c, c.return);
      if (a.flags & 32) {
        var e = a.stateNode;
        try {
          ob(e, "");
        } catch (t2) {
          W(a, a.return, t2);
        }
      }
      if (d & 4 && (e = a.stateNode, null != e)) {
        var f2 = a.memoizedProps, g = null !== c ? c.memoizedProps : f2, h = a.type, k2 = a.updateQueue;
        a.updateQueue = null;
        if (null !== k2) try {
          "input" === h && "radio" === f2.type && null != f2.name && ab(e, f2);
          vb(h, g);
          var l2 = vb(h, f2);
          for (g = 0; g < k2.length; g += 2) {
            var m2 = k2[g], q2 = k2[g + 1];
            "style" === m2 ? sb(e, q2) : "dangerouslySetInnerHTML" === m2 ? nb(e, q2) : "children" === m2 ? ob(e, q2) : ta(e, m2, q2, l2);
          }
          switch (h) {
            case "input":
              bb(e, f2);
              break;
            case "textarea":
              ib(e, f2);
              break;
            case "select":
              var r2 = e._wrapperState.wasMultiple;
              e._wrapperState.wasMultiple = !!f2.multiple;
              var y2 = f2.value;
              null != y2 ? fb(e, !!f2.multiple, y2, false) : r2 !== !!f2.multiple && (null != f2.defaultValue ? fb(
                e,
                !!f2.multiple,
                f2.defaultValue,
                true
              ) : fb(e, !!f2.multiple, f2.multiple ? [] : "", false));
          }
          e[Pf] = f2;
        } catch (t2) {
          W(a, a.return, t2);
        }
      }
      break;
    case 6:
      ck(b, a);
      ek(a);
      if (d & 4) {
        if (null === a.stateNode) throw Error(p(162));
        e = a.stateNode;
        f2 = a.memoizedProps;
        try {
          e.nodeValue = f2;
        } catch (t2) {
          W(a, a.return, t2);
        }
      }
      break;
    case 3:
      ck(b, a);
      ek(a);
      if (d & 4 && null !== c && c.memoizedState.isDehydrated) try {
        bd(b.containerInfo);
      } catch (t2) {
        W(a, a.return, t2);
      }
      break;
    case 4:
      ck(b, a);
      ek(a);
      break;
    case 13:
      ck(b, a);
      ek(a);
      e = a.child;
      e.flags & 8192 && (f2 = null !== e.memoizedState, e.stateNode.isHidden = f2, !f2 || null !== e.alternate && null !== e.alternate.memoizedState || (fk = B()));
      d & 4 && ak(a);
      break;
    case 22:
      m2 = null !== c && null !== c.memoizedState;
      a.mode & 1 ? (U = (l2 = U) || m2, ck(b, a), U = l2) : ck(b, a);
      ek(a);
      if (d & 8192) {
        l2 = null !== a.memoizedState;
        if ((a.stateNode.isHidden = l2) && !m2 && 0 !== (a.mode & 1)) for (V = a, m2 = a.child; null !== m2; ) {
          for (q2 = V = m2; null !== V; ) {
            r2 = V;
            y2 = r2.child;
            switch (r2.tag) {
              case 0:
              case 11:
              case 14:
              case 15:
                Pj(4, r2, r2.return);
                break;
              case 1:
                Lj(r2, r2.return);
                var n2 = r2.stateNode;
                if ("function" === typeof n2.componentWillUnmount) {
                  d = r2;
                  c = r2.return;
                  try {
                    b = d, n2.props = b.memoizedProps, n2.state = b.memoizedState, n2.componentWillUnmount();
                  } catch (t2) {
                    W(d, c, t2);
                  }
                }
                break;
              case 5:
                Lj(r2, r2.return);
                break;
              case 22:
                if (null !== r2.memoizedState) {
                  gk(q2);
                  continue;
                }
            }
            null !== y2 ? (y2.return = r2, V = y2) : gk(q2);
          }
          m2 = m2.sibling;
        }
        a: for (m2 = null, q2 = a; ; ) {
          if (5 === q2.tag) {
            if (null === m2) {
              m2 = q2;
              try {
                e = q2.stateNode, l2 ? (f2 = e.style, "function" === typeof f2.setProperty ? f2.setProperty("display", "none", "important") : f2.display = "none") : (h = q2.stateNode, k2 = q2.memoizedProps.style, g = void 0 !== k2 && null !== k2 && k2.hasOwnProperty("display") ? k2.display : null, h.style.display = rb("display", g));
              } catch (t2) {
                W(a, a.return, t2);
              }
            }
          } else if (6 === q2.tag) {
            if (null === m2) try {
              q2.stateNode.nodeValue = l2 ? "" : q2.memoizedProps;
            } catch (t2) {
              W(a, a.return, t2);
            }
          } else if ((22 !== q2.tag && 23 !== q2.tag || null === q2.memoizedState || q2 === a) && null !== q2.child) {
            q2.child.return = q2;
            q2 = q2.child;
            continue;
          }
          if (q2 === a) break a;
          for (; null === q2.sibling; ) {
            if (null === q2.return || q2.return === a) break a;
            m2 === q2 && (m2 = null);
            q2 = q2.return;
          }
          m2 === q2 && (m2 = null);
          q2.sibling.return = q2.return;
          q2 = q2.sibling;
        }
      }
      break;
    case 19:
      ck(b, a);
      ek(a);
      d & 4 && ak(a);
      break;
    case 21:
      break;
    default:
      ck(
        b,
        a
      ), ek(a);
  }
}
function ek(a) {
  var b = a.flags;
  if (b & 2) {
    try {
      a: {
        for (var c = a.return; null !== c; ) {
          if (Tj(c)) {
            var d = c;
            break a;
          }
          c = c.return;
        }
        throw Error(p(160));
      }
      switch (d.tag) {
        case 5:
          var e = d.stateNode;
          d.flags & 32 && (ob(e, ""), d.flags &= -33);
          var f2 = Uj(a);
          Wj(a, f2, e);
          break;
        case 3:
        case 4:
          var g = d.stateNode.containerInfo, h = Uj(a);
          Vj(a, h, g);
          break;
        default:
          throw Error(p(161));
      }
    } catch (k2) {
      W(a, a.return, k2);
    }
    a.flags &= -3;
  }
  b & 4096 && (a.flags &= -4097);
}
function hk(a, b, c) {
  V = a;
  ik(a);
}
function ik(a, b, c) {
  for (var d = 0 !== (a.mode & 1); null !== V; ) {
    var e = V, f2 = e.child;
    if (22 === e.tag && d) {
      var g = null !== e.memoizedState || Jj;
      if (!g) {
        var h = e.alternate, k2 = null !== h && null !== h.memoizedState || U;
        h = Jj;
        var l2 = U;
        Jj = g;
        if ((U = k2) && !l2) for (V = e; null !== V; ) g = V, k2 = g.child, 22 === g.tag && null !== g.memoizedState ? jk(e) : null !== k2 ? (k2.return = g, V = k2) : jk(e);
        for (; null !== f2; ) V = f2, ik(f2), f2 = f2.sibling;
        V = e;
        Jj = h;
        U = l2;
      }
      kk(a);
    } else 0 !== (e.subtreeFlags & 8772) && null !== f2 ? (f2.return = e, V = f2) : kk(a);
  }
}
function kk(a) {
  for (; null !== V; ) {
    var b = V;
    if (0 !== (b.flags & 8772)) {
      var c = b.alternate;
      try {
        if (0 !== (b.flags & 8772)) switch (b.tag) {
          case 0:
          case 11:
          case 15:
            U || Qj(5, b);
            break;
          case 1:
            var d = b.stateNode;
            if (b.flags & 4 && !U) if (null === c) d.componentDidMount();
            else {
              var e = b.elementType === b.type ? c.memoizedProps : Ci(b.type, c.memoizedProps);
              d.componentDidUpdate(e, c.memoizedState, d.__reactInternalSnapshotBeforeUpdate);
            }
            var f2 = b.updateQueue;
            null !== f2 && sh(b, f2, d);
            break;
          case 3:
            var g = b.updateQueue;
            if (null !== g) {
              c = null;
              if (null !== b.child) switch (b.child.tag) {
                case 5:
                  c = b.child.stateNode;
                  break;
                case 1:
                  c = b.child.stateNode;
              }
              sh(b, g, c);
            }
            break;
          case 5:
            var h = b.stateNode;
            if (null === c && b.flags & 4) {
              c = h;
              var k2 = b.memoizedProps;
              switch (b.type) {
                case "button":
                case "input":
                case "select":
                case "textarea":
                  k2.autoFocus && c.focus();
                  break;
                case "img":
                  k2.src && (c.src = k2.src);
              }
            }
            break;
          case 6:
            break;
          case 4:
            break;
          case 12:
            break;
          case 13:
            if (null === b.memoizedState) {
              var l2 = b.alternate;
              if (null !== l2) {
                var m2 = l2.memoizedState;
                if (null !== m2) {
                  var q2 = m2.dehydrated;
                  null !== q2 && bd(q2);
                }
              }
            }
            break;
          case 19:
          case 17:
          case 21:
          case 22:
          case 23:
          case 25:
            break;
          default:
            throw Error(p(163));
        }
        U || b.flags & 512 && Rj(b);
      } catch (r2) {
        W(b, b.return, r2);
      }
    }
    if (b === a) {
      V = null;
      break;
    }
    c = b.sibling;
    if (null !== c) {
      c.return = b.return;
      V = c;
      break;
    }
    V = b.return;
  }
}
function gk(a) {
  for (; null !== V; ) {
    var b = V;
    if (b === a) {
      V = null;
      break;
    }
    var c = b.sibling;
    if (null !== c) {
      c.return = b.return;
      V = c;
      break;
    }
    V = b.return;
  }
}
function jk(a) {
  for (; null !== V; ) {
    var b = V;
    try {
      switch (b.tag) {
        case 0:
        case 11:
        case 15:
          var c = b.return;
          try {
            Qj(4, b);
          } catch (k2) {
            W(b, c, k2);
          }
          break;
        case 1:
          var d = b.stateNode;
          if ("function" === typeof d.componentDidMount) {
            var e = b.return;
            try {
              d.componentDidMount();
            } catch (k2) {
              W(b, e, k2);
            }
          }
          var f2 = b.return;
          try {
            Rj(b);
          } catch (k2) {
            W(b, f2, k2);
          }
          break;
        case 5:
          var g = b.return;
          try {
            Rj(b);
          } catch (k2) {
            W(b, g, k2);
          }
      }
    } catch (k2) {
      W(b, b.return, k2);
    }
    if (b === a) {
      V = null;
      break;
    }
    var h = b.sibling;
    if (null !== h) {
      h.return = b.return;
      V = h;
      break;
    }
    V = b.return;
  }
}
var lk = Math.ceil, mk = ua.ReactCurrentDispatcher, nk = ua.ReactCurrentOwner, ok = ua.ReactCurrentBatchConfig, K = 0, Q = null, Y = null, Z = 0, fj = 0, ej = Uf(0), T = 0, pk = null, rh = 0, qk = 0, rk = 0, sk = null, tk = null, fk = 0, Gj = Infinity, uk = null, Oi = false, Pi = null, Ri = null, vk = false, wk = null, xk = 0, yk = 0, zk = null, Ak = -1, Bk = 0;
function R() {
  return 0 !== (K & 6) ? B() : -1 !== Ak ? Ak : Ak = B();
}
function yi(a) {
  if (0 === (a.mode & 1)) return 1;
  if (0 !== (K & 2) && 0 !== Z) return Z & -Z;
  if (null !== Kg.transition) return 0 === Bk && (Bk = yc()), Bk;
  a = C;
  if (0 !== a) return a;
  a = window.event;
  a = void 0 === a ? 16 : jd(a.type);
  return a;
}
function gi(a, b, c, d) {
  if (50 < yk) throw yk = 0, zk = null, Error(p(185));
  Ac(a, c, d);
  if (0 === (K & 2) || a !== Q) a === Q && (0 === (K & 2) && (qk |= c), 4 === T && Ck(a, Z)), Dk(a, d), 1 === c && 0 === K && 0 === (b.mode & 1) && (Gj = B() + 500, fg && jg());
}
function Dk(a, b) {
  var c = a.callbackNode;
  wc(a, b);
  var d = uc(a, a === Q ? Z : 0);
  if (0 === d) null !== c && bc(c), a.callbackNode = null, a.callbackPriority = 0;
  else if (b = d & -d, a.callbackPriority !== b) {
    null != c && bc(c);
    if (1 === b) 0 === a.tag ? ig(Ek.bind(null, a)) : hg(Ek.bind(null, a)), Jf(function() {
      0 === (K & 6) && jg();
    }), c = null;
    else {
      switch (Dc(d)) {
        case 1:
          c = fc;
          break;
        case 4:
          c = gc;
          break;
        case 16:
          c = hc;
          break;
        case 536870912:
          c = jc;
          break;
        default:
          c = hc;
      }
      c = Fk(c, Gk.bind(null, a));
    }
    a.callbackPriority = b;
    a.callbackNode = c;
  }
}
function Gk(a, b) {
  Ak = -1;
  Bk = 0;
  if (0 !== (K & 6)) throw Error(p(327));
  var c = a.callbackNode;
  if (Hk() && a.callbackNode !== c) return null;
  var d = uc(a, a === Q ? Z : 0);
  if (0 === d) return null;
  if (0 !== (d & 30) || 0 !== (d & a.expiredLanes) || b) b = Ik(a, d);
  else {
    b = d;
    var e = K;
    K |= 2;
    var f2 = Jk();
    if (Q !== a || Z !== b) uk = null, Gj = B() + 500, Kk(a, b);
    do
      try {
        Lk();
        break;
      } catch (h) {
        Mk(a, h);
      }
    while (1);
    $g();
    mk.current = f2;
    K = e;
    null !== Y ? b = 0 : (Q = null, Z = 0, b = T);
  }
  if (0 !== b) {
    2 === b && (e = xc(a), 0 !== e && (d = e, b = Nk(a, e)));
    if (1 === b) throw c = pk, Kk(a, 0), Ck(a, d), Dk(a, B()), c;
    if (6 === b) Ck(a, d);
    else {
      e = a.current.alternate;
      if (0 === (d & 30) && !Ok(e) && (b = Ik(a, d), 2 === b && (f2 = xc(a), 0 !== f2 && (d = f2, b = Nk(a, f2))), 1 === b)) throw c = pk, Kk(a, 0), Ck(a, d), Dk(a, B()), c;
      a.finishedWork = e;
      a.finishedLanes = d;
      switch (b) {
        case 0:
        case 1:
          throw Error(p(345));
        case 2:
          Pk(a, tk, uk);
          break;
        case 3:
          Ck(a, d);
          if ((d & 130023424) === d && (b = fk + 500 - B(), 10 < b)) {
            if (0 !== uc(a, 0)) break;
            e = a.suspendedLanes;
            if ((e & d) !== d) {
              R();
              a.pingedLanes |= a.suspendedLanes & e;
              break;
            }
            a.timeoutHandle = Ff(Pk.bind(null, a, tk, uk), b);
            break;
          }
          Pk(a, tk, uk);
          break;
        case 4:
          Ck(a, d);
          if ((d & 4194240) === d) break;
          b = a.eventTimes;
          for (e = -1; 0 < d; ) {
            var g = 31 - oc(d);
            f2 = 1 << g;
            g = b[g];
            g > e && (e = g);
            d &= ~f2;
          }
          d = e;
          d = B() - d;
          d = (120 > d ? 120 : 480 > d ? 480 : 1080 > d ? 1080 : 1920 > d ? 1920 : 3e3 > d ? 3e3 : 4320 > d ? 4320 : 1960 * lk(d / 1960)) - d;
          if (10 < d) {
            a.timeoutHandle = Ff(Pk.bind(null, a, tk, uk), d);
            break;
          }
          Pk(a, tk, uk);
          break;
        case 5:
          Pk(a, tk, uk);
          break;
        default:
          throw Error(p(329));
      }
    }
  }
  Dk(a, B());
  return a.callbackNode === c ? Gk.bind(null, a) : null;
}
function Nk(a, b) {
  var c = sk;
  a.current.memoizedState.isDehydrated && (Kk(a, b).flags |= 256);
  a = Ik(a, b);
  2 !== a && (b = tk, tk = c, null !== b && Fj(b));
  return a;
}
function Fj(a) {
  null === tk ? tk = a : tk.push.apply(tk, a);
}
function Ok(a) {
  for (var b = a; ; ) {
    if (b.flags & 16384) {
      var c = b.updateQueue;
      if (null !== c && (c = c.stores, null !== c)) for (var d = 0; d < c.length; d++) {
        var e = c[d], f2 = e.getSnapshot;
        e = e.value;
        try {
          if (!He(f2(), e)) return false;
        } catch (g) {
          return false;
        }
      }
    }
    c = b.child;
    if (b.subtreeFlags & 16384 && null !== c) c.return = b, b = c;
    else {
      if (b === a) break;
      for (; null === b.sibling; ) {
        if (null === b.return || b.return === a) return true;
        b = b.return;
      }
      b.sibling.return = b.return;
      b = b.sibling;
    }
  }
  return true;
}
function Ck(a, b) {
  b &= ~rk;
  b &= ~qk;
  a.suspendedLanes |= b;
  a.pingedLanes &= ~b;
  for (a = a.expirationTimes; 0 < b; ) {
    var c = 31 - oc(b), d = 1 << c;
    a[c] = -1;
    b &= ~d;
  }
}
function Ek(a) {
  if (0 !== (K & 6)) throw Error(p(327));
  Hk();
  var b = uc(a, 0);
  if (0 === (b & 1)) return Dk(a, B()), null;
  var c = Ik(a, b);
  if (0 !== a.tag && 2 === c) {
    var d = xc(a);
    0 !== d && (b = d, c = Nk(a, d));
  }
  if (1 === c) throw c = pk, Kk(a, 0), Ck(a, b), Dk(a, B()), c;
  if (6 === c) throw Error(p(345));
  a.finishedWork = a.current.alternate;
  a.finishedLanes = b;
  Pk(a, tk, uk);
  Dk(a, B());
  return null;
}
function Qk(a, b) {
  var c = K;
  K |= 1;
  try {
    return a(b);
  } finally {
    K = c, 0 === K && (Gj = B() + 500, fg && jg());
  }
}
function Rk(a) {
  null !== wk && 0 === wk.tag && 0 === (K & 6) && Hk();
  var b = K;
  K |= 1;
  var c = ok.transition, d = C;
  try {
    if (ok.transition = null, C = 1, a) return a();
  } finally {
    C = d, ok.transition = c, K = b, 0 === (K & 6) && jg();
  }
}
function Hj() {
  fj = ej.current;
  E(ej);
}
function Kk(a, b) {
  a.finishedWork = null;
  a.finishedLanes = 0;
  var c = a.timeoutHandle;
  -1 !== c && (a.timeoutHandle = -1, Gf(c));
  if (null !== Y) for (c = Y.return; null !== c; ) {
    var d = c;
    wg(d);
    switch (d.tag) {
      case 1:
        d = d.type.childContextTypes;
        null !== d && void 0 !== d && $f();
        break;
      case 3:
        zh();
        E(Wf);
        E(H);
        Eh();
        break;
      case 5:
        Bh(d);
        break;
      case 4:
        zh();
        break;
      case 13:
        E(L);
        break;
      case 19:
        E(L);
        break;
      case 10:
        ah(d.type._context);
        break;
      case 22:
      case 23:
        Hj();
    }
    c = c.return;
  }
  Q = a;
  Y = a = Pg(a.current, null);
  Z = fj = b;
  T = 0;
  pk = null;
  rk = qk = rh = 0;
  tk = sk = null;
  if (null !== fh) {
    for (b = 0; b < fh.length; b++) if (c = fh[b], d = c.interleaved, null !== d) {
      c.interleaved = null;
      var e = d.next, f2 = c.pending;
      if (null !== f2) {
        var g = f2.next;
        f2.next = e;
        d.next = g;
      }
      c.pending = d;
    }
    fh = null;
  }
  return a;
}
function Mk(a, b) {
  do {
    var c = Y;
    try {
      $g();
      Fh.current = Rh;
      if (Ih) {
        for (var d = M.memoizedState; null !== d; ) {
          var e = d.queue;
          null !== e && (e.pending = null);
          d = d.next;
        }
        Ih = false;
      }
      Hh = 0;
      O = N = M = null;
      Jh = false;
      Kh = 0;
      nk.current = null;
      if (null === c || null === c.return) {
        T = 1;
        pk = b;
        Y = null;
        break;
      }
      a: {
        var f2 = a, g = c.return, h = c, k2 = b;
        b = Z;
        h.flags |= 32768;
        if (null !== k2 && "object" === typeof k2 && "function" === typeof k2.then) {
          var l2 = k2, m2 = h, q2 = m2.tag;
          if (0 === (m2.mode & 1) && (0 === q2 || 11 === q2 || 15 === q2)) {
            var r2 = m2.alternate;
            r2 ? (m2.updateQueue = r2.updateQueue, m2.memoizedState = r2.memoizedState, m2.lanes = r2.lanes) : (m2.updateQueue = null, m2.memoizedState = null);
          }
          var y2 = Ui(g);
          if (null !== y2) {
            y2.flags &= -257;
            Vi(y2, g, h, f2, b);
            y2.mode & 1 && Si(f2, l2, b);
            b = y2;
            k2 = l2;
            var n2 = b.updateQueue;
            if (null === n2) {
              var t2 = /* @__PURE__ */ new Set();
              t2.add(k2);
              b.updateQueue = t2;
            } else n2.add(k2);
            break a;
          } else {
            if (0 === (b & 1)) {
              Si(f2, l2, b);
              tj();
              break a;
            }
            k2 = Error(p(426));
          }
        } else if (I && h.mode & 1) {
          var J2 = Ui(g);
          if (null !== J2) {
            0 === (J2.flags & 65536) && (J2.flags |= 256);
            Vi(J2, g, h, f2, b);
            Jg(Ji(k2, h));
            break a;
          }
        }
        f2 = k2 = Ji(k2, h);
        4 !== T && (T = 2);
        null === sk ? sk = [f2] : sk.push(f2);
        f2 = g;
        do {
          switch (f2.tag) {
            case 3:
              f2.flags |= 65536;
              b &= -b;
              f2.lanes |= b;
              var x2 = Ni(f2, k2, b);
              ph(f2, x2);
              break a;
            case 1:
              h = k2;
              var w2 = f2.type, u2 = f2.stateNode;
              if (0 === (f2.flags & 128) && ("function" === typeof w2.getDerivedStateFromError || null !== u2 && "function" === typeof u2.componentDidCatch && (null === Ri || !Ri.has(u2)))) {
                f2.flags |= 65536;
                b &= -b;
                f2.lanes |= b;
                var F2 = Qi(f2, h, b);
                ph(f2, F2);
                break a;
              }
          }
          f2 = f2.return;
        } while (null !== f2);
      }
      Sk(c);
    } catch (na) {
      b = na;
      Y === c && null !== c && (Y = c = c.return);
      continue;
    }
    break;
  } while (1);
}
function Jk() {
  var a = mk.current;
  mk.current = Rh;
  return null === a ? Rh : a;
}
function tj() {
  if (0 === T || 3 === T || 2 === T) T = 4;
  null === Q || 0 === (rh & 268435455) && 0 === (qk & 268435455) || Ck(Q, Z);
}
function Ik(a, b) {
  var c = K;
  K |= 2;
  var d = Jk();
  if (Q !== a || Z !== b) uk = null, Kk(a, b);
  do
    try {
      Tk();
      break;
    } catch (e) {
      Mk(a, e);
    }
  while (1);
  $g();
  K = c;
  mk.current = d;
  if (null !== Y) throw Error(p(261));
  Q = null;
  Z = 0;
  return T;
}
function Tk() {
  for (; null !== Y; ) Uk(Y);
}
function Lk() {
  for (; null !== Y && !cc(); ) Uk(Y);
}
function Uk(a) {
  var b = Vk(a.alternate, a, fj);
  a.memoizedProps = a.pendingProps;
  null === b ? Sk(a) : Y = b;
  nk.current = null;
}
function Sk(a) {
  var b = a;
  do {
    var c = b.alternate;
    a = b.return;
    if (0 === (b.flags & 32768)) {
      if (c = Ej(c, b, fj), null !== c) {
        Y = c;
        return;
      }
    } else {
      c = Ij(c, b);
      if (null !== c) {
        c.flags &= 32767;
        Y = c;
        return;
      }
      if (null !== a) a.flags |= 32768, a.subtreeFlags = 0, a.deletions = null;
      else {
        T = 6;
        Y = null;
        return;
      }
    }
    b = b.sibling;
    if (null !== b) {
      Y = b;
      return;
    }
    Y = b = a;
  } while (null !== b);
  0 === T && (T = 5);
}
function Pk(a, b, c) {
  var d = C, e = ok.transition;
  try {
    ok.transition = null, C = 1, Wk(a, b, c, d);
  } finally {
    ok.transition = e, C = d;
  }
  return null;
}
function Wk(a, b, c, d) {
  do
    Hk();
  while (null !== wk);
  if (0 !== (K & 6)) throw Error(p(327));
  c = a.finishedWork;
  var e = a.finishedLanes;
  if (null === c) return null;
  a.finishedWork = null;
  a.finishedLanes = 0;
  if (c === a.current) throw Error(p(177));
  a.callbackNode = null;
  a.callbackPriority = 0;
  var f2 = c.lanes | c.childLanes;
  Bc(a, f2);
  a === Q && (Y = Q = null, Z = 0);
  0 === (c.subtreeFlags & 2064) && 0 === (c.flags & 2064) || vk || (vk = true, Fk(hc, function() {
    Hk();
    return null;
  }));
  f2 = 0 !== (c.flags & 15990);
  if (0 !== (c.subtreeFlags & 15990) || f2) {
    f2 = ok.transition;
    ok.transition = null;
    var g = C;
    C = 1;
    var h = K;
    K |= 4;
    nk.current = null;
    Oj(a, c);
    dk(c, a);
    Oe(Df);
    dd = !!Cf;
    Df = Cf = null;
    a.current = c;
    hk(c);
    dc();
    K = h;
    C = g;
    ok.transition = f2;
  } else a.current = c;
  vk && (vk = false, wk = a, xk = e);
  f2 = a.pendingLanes;
  0 === f2 && (Ri = null);
  mc(c.stateNode);
  Dk(a, B());
  if (null !== b) for (d = a.onRecoverableError, c = 0; c < b.length; c++) e = b[c], d(e.value, { componentStack: e.stack, digest: e.digest });
  if (Oi) throw Oi = false, a = Pi, Pi = null, a;
  0 !== (xk & 1) && 0 !== a.tag && Hk();
  f2 = a.pendingLanes;
  0 !== (f2 & 1) ? a === zk ? yk++ : (yk = 0, zk = a) : yk = 0;
  jg();
  return null;
}
function Hk() {
  if (null !== wk) {
    var a = Dc(xk), b = ok.transition, c = C;
    try {
      ok.transition = null;
      C = 16 > a ? 16 : a;
      if (null === wk) var d = false;
      else {
        a = wk;
        wk = null;
        xk = 0;
        if (0 !== (K & 6)) throw Error(p(331));
        var e = K;
        K |= 4;
        for (V = a.current; null !== V; ) {
          var f2 = V, g = f2.child;
          if (0 !== (V.flags & 16)) {
            var h = f2.deletions;
            if (null !== h) {
              for (var k2 = 0; k2 < h.length; k2++) {
                var l2 = h[k2];
                for (V = l2; null !== V; ) {
                  var m2 = V;
                  switch (m2.tag) {
                    case 0:
                    case 11:
                    case 15:
                      Pj(8, m2, f2);
                  }
                  var q2 = m2.child;
                  if (null !== q2) q2.return = m2, V = q2;
                  else for (; null !== V; ) {
                    m2 = V;
                    var r2 = m2.sibling, y2 = m2.return;
                    Sj(m2);
                    if (m2 === l2) {
                      V = null;
                      break;
                    }
                    if (null !== r2) {
                      r2.return = y2;
                      V = r2;
                      break;
                    }
                    V = y2;
                  }
                }
              }
              var n2 = f2.alternate;
              if (null !== n2) {
                var t2 = n2.child;
                if (null !== t2) {
                  n2.child = null;
                  do {
                    var J2 = t2.sibling;
                    t2.sibling = null;
                    t2 = J2;
                  } while (null !== t2);
                }
              }
              V = f2;
            }
          }
          if (0 !== (f2.subtreeFlags & 2064) && null !== g) g.return = f2, V = g;
          else b: for (; null !== V; ) {
            f2 = V;
            if (0 !== (f2.flags & 2048)) switch (f2.tag) {
              case 0:
              case 11:
              case 15:
                Pj(9, f2, f2.return);
            }
            var x2 = f2.sibling;
            if (null !== x2) {
              x2.return = f2.return;
              V = x2;
              break b;
            }
            V = f2.return;
          }
        }
        var w2 = a.current;
        for (V = w2; null !== V; ) {
          g = V;
          var u2 = g.child;
          if (0 !== (g.subtreeFlags & 2064) && null !== u2) u2.return = g, V = u2;
          else b: for (g = w2; null !== V; ) {
            h = V;
            if (0 !== (h.flags & 2048)) try {
              switch (h.tag) {
                case 0:
                case 11:
                case 15:
                  Qj(9, h);
              }
            } catch (na) {
              W(h, h.return, na);
            }
            if (h === g) {
              V = null;
              break b;
            }
            var F2 = h.sibling;
            if (null !== F2) {
              F2.return = h.return;
              V = F2;
              break b;
            }
            V = h.return;
          }
        }
        K = e;
        jg();
        if (lc && "function" === typeof lc.onPostCommitFiberRoot) try {
          lc.onPostCommitFiberRoot(kc, a);
        } catch (na) {
        }
        d = true;
      }
      return d;
    } finally {
      C = c, ok.transition = b;
    }
  }
  return false;
}
function Xk(a, b, c) {
  b = Ji(c, b);
  b = Ni(a, b, 1);
  a = nh(a, b, 1);
  b = R();
  null !== a && (Ac(a, 1, b), Dk(a, b));
}
function W(a, b, c) {
  if (3 === a.tag) Xk(a, a, c);
  else for (; null !== b; ) {
    if (3 === b.tag) {
      Xk(b, a, c);
      break;
    } else if (1 === b.tag) {
      var d = b.stateNode;
      if ("function" === typeof b.type.getDerivedStateFromError || "function" === typeof d.componentDidCatch && (null === Ri || !Ri.has(d))) {
        a = Ji(c, a);
        a = Qi(b, a, 1);
        b = nh(b, a, 1);
        a = R();
        null !== b && (Ac(b, 1, a), Dk(b, a));
        break;
      }
    }
    b = b.return;
  }
}
function Ti(a, b, c) {
  var d = a.pingCache;
  null !== d && d.delete(b);
  b = R();
  a.pingedLanes |= a.suspendedLanes & c;
  Q === a && (Z & c) === c && (4 === T || 3 === T && (Z & 130023424) === Z && 500 > B() - fk ? Kk(a, 0) : rk |= c);
  Dk(a, b);
}
function Yk(a, b) {
  0 === b && (0 === (a.mode & 1) ? b = 1 : (b = sc, sc <<= 1, 0 === (sc & 130023424) && (sc = 4194304)));
  var c = R();
  a = ih(a, b);
  null !== a && (Ac(a, b, c), Dk(a, c));
}
function uj(a) {
  var b = a.memoizedState, c = 0;
  null !== b && (c = b.retryLane);
  Yk(a, c);
}
function bk(a, b) {
  var c = 0;
  switch (a.tag) {
    case 13:
      var d = a.stateNode;
      var e = a.memoizedState;
      null !== e && (c = e.retryLane);
      break;
    case 19:
      d = a.stateNode;
      break;
    default:
      throw Error(p(314));
  }
  null !== d && d.delete(b);
  Yk(a, c);
}
var Vk;
Vk = function(a, b, c) {
  if (null !== a) if (a.memoizedProps !== b.pendingProps || Wf.current) dh = true;
  else {
    if (0 === (a.lanes & c) && 0 === (b.flags & 128)) return dh = false, yj(a, b, c);
    dh = 0 !== (a.flags & 131072) ? true : false;
  }
  else dh = false, I && 0 !== (b.flags & 1048576) && ug(b, ng, b.index);
  b.lanes = 0;
  switch (b.tag) {
    case 2:
      var d = b.type;
      ij(a, b);
      a = b.pendingProps;
      var e = Yf(b, H.current);
      ch(b, c);
      e = Nh(null, b, d, a, e, c);
      var f2 = Sh();
      b.flags |= 1;
      "object" === typeof e && null !== e && "function" === typeof e.render && void 0 === e.$$typeof ? (b.tag = 1, b.memoizedState = null, b.updateQueue = null, Zf(d) ? (f2 = true, cg(b)) : f2 = false, b.memoizedState = null !== e.state && void 0 !== e.state ? e.state : null, kh(b), e.updater = Ei, b.stateNode = e, e._reactInternals = b, Ii(b, d, a, c), b = jj(null, b, d, true, f2, c)) : (b.tag = 0, I && f2 && vg(b), Xi(null, b, e, c), b = b.child);
      return b;
    case 16:
      d = b.elementType;
      a: {
        ij(a, b);
        a = b.pendingProps;
        e = d._init;
        d = e(d._payload);
        b.type = d;
        e = b.tag = Zk(d);
        a = Ci(d, a);
        switch (e) {
          case 0:
            b = cj(null, b, d, a, c);
            break a;
          case 1:
            b = hj(null, b, d, a, c);
            break a;
          case 11:
            b = Yi(null, b, d, a, c);
            break a;
          case 14:
            b = $i(null, b, d, Ci(d.type, a), c);
            break a;
        }
        throw Error(p(
          306,
          d,
          ""
        ));
      }
      return b;
    case 0:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), cj(a, b, d, e, c);
    case 1:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), hj(a, b, d, e, c);
    case 3:
      a: {
        kj(b);
        if (null === a) throw Error(p(387));
        d = b.pendingProps;
        f2 = b.memoizedState;
        e = f2.element;
        lh(a, b);
        qh(b, d, null, c);
        var g = b.memoizedState;
        d = g.element;
        if (f2.isDehydrated) if (f2 = { element: d, isDehydrated: false, cache: g.cache, pendingSuspenseBoundaries: g.pendingSuspenseBoundaries, transitions: g.transitions }, b.updateQueue.baseState = f2, b.memoizedState = f2, b.flags & 256) {
          e = Ji(Error(p(423)), b);
          b = lj(a, b, d, c, e);
          break a;
        } else if (d !== e) {
          e = Ji(Error(p(424)), b);
          b = lj(a, b, d, c, e);
          break a;
        } else for (yg = Lf(b.stateNode.containerInfo.firstChild), xg = b, I = true, zg = null, c = Vg(b, null, d, c), b.child = c; c; ) c.flags = c.flags & -3 | 4096, c = c.sibling;
        else {
          Ig();
          if (d === e) {
            b = Zi(a, b, c);
            break a;
          }
          Xi(a, b, d, c);
        }
        b = b.child;
      }
      return b;
    case 5:
      return Ah(b), null === a && Eg(b), d = b.type, e = b.pendingProps, f2 = null !== a ? a.memoizedProps : null, g = e.children, Ef(d, e) ? g = null : null !== f2 && Ef(d, f2) && (b.flags |= 32), gj(a, b), Xi(a, b, g, c), b.child;
    case 6:
      return null === a && Eg(b), null;
    case 13:
      return oj(a, b, c);
    case 4:
      return yh(b, b.stateNode.containerInfo), d = b.pendingProps, null === a ? b.child = Ug(b, null, d, c) : Xi(a, b, d, c), b.child;
    case 11:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), Yi(a, b, d, e, c);
    case 7:
      return Xi(a, b, b.pendingProps, c), b.child;
    case 8:
      return Xi(a, b, b.pendingProps.children, c), b.child;
    case 12:
      return Xi(a, b, b.pendingProps.children, c), b.child;
    case 10:
      a: {
        d = b.type._context;
        e = b.pendingProps;
        f2 = b.memoizedProps;
        g = e.value;
        G(Wg, d._currentValue);
        d._currentValue = g;
        if (null !== f2) if (He(f2.value, g)) {
          if (f2.children === e.children && !Wf.current) {
            b = Zi(a, b, c);
            break a;
          }
        } else for (f2 = b.child, null !== f2 && (f2.return = b); null !== f2; ) {
          var h = f2.dependencies;
          if (null !== h) {
            g = f2.child;
            for (var k2 = h.firstContext; null !== k2; ) {
              if (k2.context === d) {
                if (1 === f2.tag) {
                  k2 = mh(-1, c & -c);
                  k2.tag = 2;
                  var l2 = f2.updateQueue;
                  if (null !== l2) {
                    l2 = l2.shared;
                    var m2 = l2.pending;
                    null === m2 ? k2.next = k2 : (k2.next = m2.next, m2.next = k2);
                    l2.pending = k2;
                  }
                }
                f2.lanes |= c;
                k2 = f2.alternate;
                null !== k2 && (k2.lanes |= c);
                bh(
                  f2.return,
                  c,
                  b
                );
                h.lanes |= c;
                break;
              }
              k2 = k2.next;
            }
          } else if (10 === f2.tag) g = f2.type === b.type ? null : f2.child;
          else if (18 === f2.tag) {
            g = f2.return;
            if (null === g) throw Error(p(341));
            g.lanes |= c;
            h = g.alternate;
            null !== h && (h.lanes |= c);
            bh(g, c, b);
            g = f2.sibling;
          } else g = f2.child;
          if (null !== g) g.return = f2;
          else for (g = f2; null !== g; ) {
            if (g === b) {
              g = null;
              break;
            }
            f2 = g.sibling;
            if (null !== f2) {
              f2.return = g.return;
              g = f2;
              break;
            }
            g = g.return;
          }
          f2 = g;
        }
        Xi(a, b, e.children, c);
        b = b.child;
      }
      return b;
    case 9:
      return e = b.type, d = b.pendingProps.children, ch(b, c), e = eh(e), d = d(e), b.flags |= 1, Xi(a, b, d, c), b.child;
    case 14:
      return d = b.type, e = Ci(d, b.pendingProps), e = Ci(d.type, e), $i(a, b, d, e, c);
    case 15:
      return bj(a, b, b.type, b.pendingProps, c);
    case 17:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), ij(a, b), b.tag = 1, Zf(d) ? (a = true, cg(b)) : a = false, ch(b, c), Gi(b, d, e), Ii(b, d, e, c), jj(null, b, d, true, a, c);
    case 19:
      return xj(a, b, c);
    case 22:
      return dj(a, b, c);
  }
  throw Error(p(156, b.tag));
};
function Fk(a, b) {
  return ac(a, b);
}
function $k(a, b, c, d) {
  this.tag = a;
  this.key = c;
  this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null;
  this.index = 0;
  this.ref = null;
  this.pendingProps = b;
  this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null;
  this.mode = d;
  this.subtreeFlags = this.flags = 0;
  this.deletions = null;
  this.childLanes = this.lanes = 0;
  this.alternate = null;
}
function Bg(a, b, c, d) {
  return new $k(a, b, c, d);
}
function aj(a) {
  a = a.prototype;
  return !(!a || !a.isReactComponent);
}
function Zk(a) {
  if ("function" === typeof a) return aj(a) ? 1 : 0;
  if (void 0 !== a && null !== a) {
    a = a.$$typeof;
    if (a === Da) return 11;
    if (a === Ga) return 14;
  }
  return 2;
}
function Pg(a, b) {
  var c = a.alternate;
  null === c ? (c = Bg(a.tag, b, a.key, a.mode), c.elementType = a.elementType, c.type = a.type, c.stateNode = a.stateNode, c.alternate = a, a.alternate = c) : (c.pendingProps = b, c.type = a.type, c.flags = 0, c.subtreeFlags = 0, c.deletions = null);
  c.flags = a.flags & 14680064;
  c.childLanes = a.childLanes;
  c.lanes = a.lanes;
  c.child = a.child;
  c.memoizedProps = a.memoizedProps;
  c.memoizedState = a.memoizedState;
  c.updateQueue = a.updateQueue;
  b = a.dependencies;
  c.dependencies = null === b ? null : { lanes: b.lanes, firstContext: b.firstContext };
  c.sibling = a.sibling;
  c.index = a.index;
  c.ref = a.ref;
  return c;
}
function Rg(a, b, c, d, e, f2) {
  var g = 2;
  d = a;
  if ("function" === typeof a) aj(a) && (g = 1);
  else if ("string" === typeof a) g = 5;
  else a: switch (a) {
    case ya:
      return Tg(c.children, e, f2, b);
    case za:
      g = 8;
      e |= 8;
      break;
    case Aa:
      return a = Bg(12, c, b, e | 2), a.elementType = Aa, a.lanes = f2, a;
    case Ea:
      return a = Bg(13, c, b, e), a.elementType = Ea, a.lanes = f2, a;
    case Fa:
      return a = Bg(19, c, b, e), a.elementType = Fa, a.lanes = f2, a;
    case Ia:
      return pj(c, e, f2, b);
    default:
      if ("object" === typeof a && null !== a) switch (a.$$typeof) {
        case Ba:
          g = 10;
          break a;
        case Ca:
          g = 9;
          break a;
        case Da:
          g = 11;
          break a;
        case Ga:
          g = 14;
          break a;
        case Ha:
          g = 16;
          d = null;
          break a;
      }
      throw Error(p(130, null == a ? a : typeof a, ""));
  }
  b = Bg(g, c, b, e);
  b.elementType = a;
  b.type = d;
  b.lanes = f2;
  return b;
}
function Tg(a, b, c, d) {
  a = Bg(7, a, d, b);
  a.lanes = c;
  return a;
}
function pj(a, b, c, d) {
  a = Bg(22, a, d, b);
  a.elementType = Ia;
  a.lanes = c;
  a.stateNode = { isHidden: false };
  return a;
}
function Qg(a, b, c) {
  a = Bg(6, a, null, b);
  a.lanes = c;
  return a;
}
function Sg(a, b, c) {
  b = Bg(4, null !== a.children ? a.children : [], a.key, b);
  b.lanes = c;
  b.stateNode = { containerInfo: a.containerInfo, pendingChildren: null, implementation: a.implementation };
  return b;
}
function al(a, b, c, d, e) {
  this.tag = b;
  this.containerInfo = a;
  this.finishedWork = this.pingCache = this.current = this.pendingChildren = null;
  this.timeoutHandle = -1;
  this.callbackNode = this.pendingContext = this.context = null;
  this.callbackPriority = 0;
  this.eventTimes = zc(0);
  this.expirationTimes = zc(-1);
  this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0;
  this.entanglements = zc(0);
  this.identifierPrefix = d;
  this.onRecoverableError = e;
  this.mutableSourceEagerHydrationData = null;
}
function bl(a, b, c, d, e, f2, g, h, k2) {
  a = new al(a, b, c, h, k2);
  1 === b ? (b = 1, true === f2 && (b |= 8)) : b = 0;
  f2 = Bg(3, null, null, b);
  a.current = f2;
  f2.stateNode = a;
  f2.memoizedState = { element: d, isDehydrated: c, cache: null, transitions: null, pendingSuspenseBoundaries: null };
  kh(f2);
  return a;
}
function cl(a, b, c) {
  var d = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
  return { $$typeof: wa, key: null == d ? null : "" + d, children: a, containerInfo: b, implementation: c };
}
function dl(a) {
  if (!a) return Vf;
  a = a._reactInternals;
  a: {
    if (Vb(a) !== a || 1 !== a.tag) throw Error(p(170));
    var b = a;
    do {
      switch (b.tag) {
        case 3:
          b = b.stateNode.context;
          break a;
        case 1:
          if (Zf(b.type)) {
            b = b.stateNode.__reactInternalMemoizedMergedChildContext;
            break a;
          }
      }
      b = b.return;
    } while (null !== b);
    throw Error(p(171));
  }
  if (1 === a.tag) {
    var c = a.type;
    if (Zf(c)) return bg(a, c, b);
  }
  return b;
}
function el(a, b, c, d, e, f2, g, h, k2) {
  a = bl(c, d, true, a, e, f2, g, h, k2);
  a.context = dl(null);
  c = a.current;
  d = R();
  e = yi(c);
  f2 = mh(d, e);
  f2.callback = void 0 !== b && null !== b ? b : null;
  nh(c, f2, e);
  a.current.lanes = e;
  Ac(a, e, d);
  Dk(a, d);
  return a;
}
function fl(a, b, c, d) {
  var e = b.current, f2 = R(), g = yi(e);
  c = dl(c);
  null === b.context ? b.context = c : b.pendingContext = c;
  b = mh(f2, g);
  b.payload = { element: a };
  d = void 0 === d ? null : d;
  null !== d && (b.callback = d);
  a = nh(e, b, g);
  null !== a && (gi(a, e, g, f2), oh(a, e, g));
  return g;
}
function gl(a) {
  a = a.current;
  if (!a.child) return null;
  switch (a.child.tag) {
    case 5:
      return a.child.stateNode;
    default:
      return a.child.stateNode;
  }
}
function hl(a, b) {
  a = a.memoizedState;
  if (null !== a && null !== a.dehydrated) {
    var c = a.retryLane;
    a.retryLane = 0 !== c && c < b ? c : b;
  }
}
function il(a, b) {
  hl(a, b);
  (a = a.alternate) && hl(a, b);
}
function jl() {
  return null;
}
var kl = "function" === typeof reportError ? reportError : function(a) {
  console.error(a);
};
function ll(a) {
  this._internalRoot = a;
}
ml.prototype.render = ll.prototype.render = function(a) {
  var b = this._internalRoot;
  if (null === b) throw Error(p(409));
  fl(a, b, null, null);
};
ml.prototype.unmount = ll.prototype.unmount = function() {
  var a = this._internalRoot;
  if (null !== a) {
    this._internalRoot = null;
    var b = a.containerInfo;
    Rk(function() {
      fl(null, a, null, null);
    });
    b[uf] = null;
  }
};
function ml(a) {
  this._internalRoot = a;
}
ml.prototype.unstable_scheduleHydration = function(a) {
  if (a) {
    var b = Hc();
    a = { blockedOn: null, target: a, priority: b };
    for (var c = 0; c < Qc.length && 0 !== b && b < Qc[c].priority; c++) ;
    Qc.splice(c, 0, a);
    0 === c && Vc(a);
  }
};
function nl(a) {
  return !(!a || 1 !== a.nodeType && 9 !== a.nodeType && 11 !== a.nodeType);
}
function ol(a) {
  return !(!a || 1 !== a.nodeType && 9 !== a.nodeType && 11 !== a.nodeType && (8 !== a.nodeType || " react-mount-point-unstable " !== a.nodeValue));
}
function pl() {
}
function ql(a, b, c, d, e) {
  if (e) {
    if ("function" === typeof d) {
      var f2 = d;
      d = function() {
        var a2 = gl(g);
        f2.call(a2);
      };
    }
    var g = el(b, d, a, 0, null, false, false, "", pl);
    a._reactRootContainer = g;
    a[uf] = g.current;
    sf(8 === a.nodeType ? a.parentNode : a);
    Rk();
    return g;
  }
  for (; e = a.lastChild; ) a.removeChild(e);
  if ("function" === typeof d) {
    var h = d;
    d = function() {
      var a2 = gl(k2);
      h.call(a2);
    };
  }
  var k2 = bl(a, 0, false, null, null, false, false, "", pl);
  a._reactRootContainer = k2;
  a[uf] = k2.current;
  sf(8 === a.nodeType ? a.parentNode : a);
  Rk(function() {
    fl(b, k2, c, d);
  });
  return k2;
}
function rl(a, b, c, d, e) {
  var f2 = c._reactRootContainer;
  if (f2) {
    var g = f2;
    if ("function" === typeof e) {
      var h = e;
      e = function() {
        var a2 = gl(g);
        h.call(a2);
      };
    }
    fl(b, g, a, e);
  } else g = ql(c, b, a, e, d);
  return gl(g);
}
Ec = function(a) {
  switch (a.tag) {
    case 3:
      var b = a.stateNode;
      if (b.current.memoizedState.isDehydrated) {
        var c = tc(b.pendingLanes);
        0 !== c && (Cc(b, c | 1), Dk(b, B()), 0 === (K & 6) && (Gj = B() + 500, jg()));
      }
      break;
    case 13:
      Rk(function() {
        var b2 = ih(a, 1);
        if (null !== b2) {
          var c2 = R();
          gi(b2, a, 1, c2);
        }
      }), il(a, 1);
  }
};
Fc = function(a) {
  if (13 === a.tag) {
    var b = ih(a, 134217728);
    if (null !== b) {
      var c = R();
      gi(b, a, 134217728, c);
    }
    il(a, 134217728);
  }
};
Gc = function(a) {
  if (13 === a.tag) {
    var b = yi(a), c = ih(a, b);
    if (null !== c) {
      var d = R();
      gi(c, a, b, d);
    }
    il(a, b);
  }
};
Hc = function() {
  return C;
};
Ic = function(a, b) {
  var c = C;
  try {
    return C = a, b();
  } finally {
    C = c;
  }
};
yb = function(a, b, c) {
  switch (b) {
    case "input":
      bb(a, c);
      b = c.name;
      if ("radio" === c.type && null != b) {
        for (c = a; c.parentNode; ) c = c.parentNode;
        c = c.querySelectorAll("input[name=" + JSON.stringify("" + b) + '][type="radio"]');
        for (b = 0; b < c.length; b++) {
          var d = c[b];
          if (d !== a && d.form === a.form) {
            var e = Db(d);
            if (!e) throw Error(p(90));
            Wa(d);
            bb(d, e);
          }
        }
      }
      break;
    case "textarea":
      ib(a, c);
      break;
    case "select":
      b = c.value, null != b && fb(a, !!c.multiple, b, false);
  }
};
Gb = Qk;
Hb = Rk;
var sl = { usingClientEntryPoint: false, Events: [Cb, ue, Db, Eb, Fb, Qk] }, tl = { findFiberByHostInstance: Wc, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" };
var ul = { bundleType: tl.bundleType, version: tl.version, rendererPackageName: tl.rendererPackageName, rendererConfig: tl.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: ua.ReactCurrentDispatcher, findHostInstanceByFiber: function(a) {
  a = Zb(a);
  return null === a ? null : a.stateNode;
}, findFiberByHostInstance: tl.findFiberByHostInstance || jl, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
if ("undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) {
  var vl = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!vl.isDisabled && vl.supportsFiber) try {
    kc = vl.inject(ul), lc = vl;
  } catch (a) {
  }
}
reactDom_production_min.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = sl;
reactDom_production_min.createPortal = function(a, b) {
  var c = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
  if (!nl(b)) throw Error(p(200));
  return cl(a, b, null, c);
};
reactDom_production_min.createRoot = function(a, b) {
  if (!nl(a)) throw Error(p(299));
  var c = false, d = "", e = kl;
  null !== b && void 0 !== b && (true === b.unstable_strictMode && (c = true), void 0 !== b.identifierPrefix && (d = b.identifierPrefix), void 0 !== b.onRecoverableError && (e = b.onRecoverableError));
  b = bl(a, 1, false, null, null, c, false, d, e);
  a[uf] = b.current;
  sf(8 === a.nodeType ? a.parentNode : a);
  return new ll(b);
};
reactDom_production_min.findDOMNode = function(a) {
  if (null == a) return null;
  if (1 === a.nodeType) return a;
  var b = a._reactInternals;
  if (void 0 === b) {
    if ("function" === typeof a.render) throw Error(p(188));
    a = Object.keys(a).join(",");
    throw Error(p(268, a));
  }
  a = Zb(b);
  a = null === a ? null : a.stateNode;
  return a;
};
reactDom_production_min.flushSync = function(a) {
  return Rk(a);
};
reactDom_production_min.hydrate = function(a, b, c) {
  if (!ol(b)) throw Error(p(200));
  return rl(null, a, b, true, c);
};
reactDom_production_min.hydrateRoot = function(a, b, c) {
  if (!nl(a)) throw Error(p(405));
  var d = null != c && c.hydratedSources || null, e = false, f2 = "", g = kl;
  null !== c && void 0 !== c && (true === c.unstable_strictMode && (e = true), void 0 !== c.identifierPrefix && (f2 = c.identifierPrefix), void 0 !== c.onRecoverableError && (g = c.onRecoverableError));
  b = el(b, null, a, 1, null != c ? c : null, e, false, f2, g);
  a[uf] = b.current;
  sf(a);
  if (d) for (a = 0; a < d.length; a++) c = d[a], e = c._getVersion, e = e(c._source), null == b.mutableSourceEagerHydrationData ? b.mutableSourceEagerHydrationData = [c, e] : b.mutableSourceEagerHydrationData.push(
    c,
    e
  );
  return new ml(b);
};
reactDom_production_min.render = function(a, b, c) {
  if (!ol(b)) throw Error(p(200));
  return rl(null, a, b, false, c);
};
reactDom_production_min.unmountComponentAtNode = function(a) {
  if (!ol(a)) throw Error(p(40));
  return a._reactRootContainer ? (Rk(function() {
    rl(null, null, a, false, function() {
      a._reactRootContainer = null;
      a[uf] = null;
    });
  }), true) : false;
};
reactDom_production_min.unstable_batchedUpdates = Qk;
reactDom_production_min.unstable_renderSubtreeIntoContainer = function(a, b, c, d) {
  if (!ol(c)) throw Error(p(200));
  if (null == a || void 0 === a._reactInternals) throw Error(p(38));
  return rl(a, b, c, false, d);
};
reactDom_production_min.version = "18.3.1-next-f1338f8080-20240426";
function checkDCE() {
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== "function") {
    return;
  }
  try {
    __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
  } catch (err) {
    console.error(err);
  }
}
{
  checkDCE();
  reactDom.exports = reactDom_production_min;
}
var reactDomExports = reactDom.exports;
var m = reactDomExports;
{
  client.createRoot = m.createRoot;
  client.hydrateRoot = m.hydrateRoot;
}
const ARABIC_INDIC_DIGITS = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9"
};
function toAsciiDigits(input) {
  if (!input) return input;
  return input.replace(/[٠-٩۰-۹]/g, (ch2) => ARABIC_INDIC_DIGITS[ch2] ?? ch2);
}
const PIASTRES_PER_EGP = 100;
function assertSafeInteger(value, label) {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be finite, got ${value}`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be a safe integer piastre value, got ${value}`);
  }
}
function toPiastres(input) {
  const text = typeof input === "number" ? String(input) : toAsciiDigits(input.trim());
  if (text === "") throw new RangeError("Empty money value");
  const match = /^(-)?(\d*)(?:[.,](\d*))?$/.exec(text);
  if (!match) throw new RangeError(`Not a valid money value: ${input}`);
  const [, sign, whole = "", frac = ""] = match;
  if (whole === "" && frac === "") throw new RangeError(`Not a valid money value: ${input}`);
  if (frac.length > 2) {
    throw new RangeError(
      `Money has at most 2 decimal places, got ${frac.length} in "${input}"`
    );
  }
  const padded = (frac + "00").slice(0, 2);
  const value = Number(whole || "0") * PIASTRES_PER_EGP + Number(padded);
  assertSafeInteger(value, "money");
  return sign === "-" ? -value : value;
}
function fromPiastres(value) {
  assertSafeInteger(value, "money");
  const negative = value < 0;
  const abs = Math.abs(value);
  const whole = Math.trunc(abs / PIASTRES_PER_EGP);
  const frac = abs % PIASTRES_PER_EGP;
  return `${negative ? "-" : ""}${whole}.${String(frac).padStart(2, "0")}`;
}
function allocate(total, weights) {
  assertSafeInteger(total, "money");
  if (weights.length === 0) return [];
  if (weights.some((w2) => w2 < 0 || !Number.isFinite(w2))) {
    throw new RangeError("Allocation weights must be finite and non-negative");
  }
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const effective = weightSum === 0 ? weights.map(() => 1) : weights;
  const effectiveSum = weightSum === 0 ? weights.length : weightSum;
  const raw = effective.map((w2) => total * w2 / effectiveSum);
  const floored = raw.map((r2) => Math.floor(r2));
  let remainder = total - floored.reduce((a, b) => a + b, 0);
  const order = raw.map((r2, i) => ({ i, frac: r2 - Math.floor(r2) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  const result = [...floored];
  let cursor = 0;
  while (remainder > 0 && order.length > 0) {
    const entry = order[cursor % order.length];
    result[entry.i] = result[entry.i] + 1;
    remainder -= 1;
    cursor += 1;
  }
  while (remainder < 0 && order.length > 0) {
    const entry = order[cursor % order.length];
    result[entry.i] = result[entry.i] - 1;
    remainder += 1;
    cursor += 1;
  }
  return result;
}
function assertValidFactor(factor) {
  if (!Number.isInteger(factor) || factor < 1) {
    throw new RangeError(`Unit factor must be a positive integer, got ${factor}`);
  }
}
function toBaseUnits(quantityInUnit, factor) {
  assertValidFactor(factor);
  if (!Number.isFinite(quantityInUnit)) {
    throw new RangeError(`Quantity must be finite, got ${quantityInUnit}`);
  }
  const exact = quantityInUnit * factor;
  const rounded = Math.round(exact);
  if (Math.abs(exact - rounded) > 1e-9) {
    throw new RangeError(
      `${quantityInUnit} of a unit containing ${factor} base units is ${exact} base units, which is not a whole number`
    );
  }
  return rounded;
}
function validateUnitSet(units) {
  const errors = [];
  const bases = units.filter((u2) => u2.isBase);
  if (bases.length === 0) errors.push("No base unit defined");
  if (bases.length > 1) errors.push(`${bases.length} base units defined, expected exactly 1`);
  if (bases.length === 1 && bases[0].factor !== 1) {
    errors.push(`Base unit must have factor 1, got ${bases[0].factor}`);
  }
  for (const u2 of units) {
    if (!Number.isInteger(u2.factor) || u2.factor < 1) {
      errors.push(`Unit "${u2.nameAr}" has invalid factor ${u2.factor}`);
    }
  }
  const names = /* @__PURE__ */ new Set();
  for (const u2 of units) {
    if (names.has(u2.nameAr)) errors.push(`Duplicate unit name "${u2.nameAr}"`);
    names.add(u2.nameAr);
  }
  return errors;
}
const REQUIRED_FIELDS = ["nameAr"];
const IMPORTABLE_FIELDS = [
  "nameAr",
  "nameEn",
  "barcode",
  "publicPrice",
  "scientificName",
  "shelfLocation",
  "unitName",
  "unitFactor",
  "salePrice",
  "minStock"
];
function rejectedToCsv(rejected, headers) {
  const escape2 = (v2) => {
    const s = String(v2 ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [["row", "reason", ...headers].map(escape2).join(",")];
  for (const r2 of rejected) {
    lines.push([String(r2.rowNumber), r2.reason, ...r2.raw].map(escape2).join(","));
  }
  return lines.join("\n");
}
function landedCost(lines, headerExpenses, headerDiscount) {
  if (lines.length === 0) return [];
  for (const line of lines) {
    if (line.qtyBase + line.bonusBase <= 0) {
      throw new RangeError(
        `Line ${line.lineNo} has zero total quantity (qtyBase + bonusBase); cannot compute a per-unit cost`
      );
    }
  }
  const weights = lines.map((l2) => l2.lineTotal);
  const expenseShares = allocate(headerExpenses, weights);
  const discountShares = allocate(headerDiscount, weights);
  return lines.map((line, i) => {
    const allocatedExpense = expenseShares[i];
    const allocatedDiscount = discountShares[i];
    const adjustedTotal = line.lineTotal + allocatedExpense - allocatedDiscount;
    const totalQty = line.qtyBase + line.bonusBase;
    return {
      lineNo: line.lineNo,
      allocatedExpense,
      allocatedDiscount,
      landedUnitCost: Math.trunc(adjustedTotal / totalQty)
    };
  });
}
const ar = {
  app: {
    title: "نظام إدارة الصيدلية"
  },
  modules: {
    sales: "المبيعات",
    returns: "المرتجع",
    purchases: "المشتريات",
    items: "الأصناف",
    customers: "العملاء",
    log: "السجل"
  },
  drawer: {
    home: "الرئيسية",
    customers: "العملاء",
    customersList: "العملاء",
    customersReports: "التقارير",
    items: "الأصناف",
    itemsList: "الأصناف",
    itemsStock: "المخزون حسب الصنف",
    itemsIbnSina: "ابن سينا مباشر",
    itemsExpiry: "لوحة الصلاحية",
    warehouses: "المخازن",
    warehousesList: "المخازن",
    sales: "المبيعات",
    salesInvoices: "فواتير المبيعات",
    salesShiftHandover: "تسليم الدرج",
    salesReturnByInvoice: "مرتجع فواتير البيع",
    salesReturnGeneral: "مرتجع بيع عام",
    salesReports: "التقارير",
    purchases: "المشتريات",
    purchaseInvoices: "فواتير الشراء",
    suppliersList: "الموردون",
    purchaseReturnByInvoice: "مرتجعات فواتير الشراء",
    purchaseReturnGeneral: "مرتجعات شراء عام",
    accounts: "الحسابات",
    cashInOut: "صرف وتوريد نقدية",
    settings: "الإعدادات",
    settingsGeneral: "الإعدادات العامة",
    settingsConnection: "الاتصال سليم"
  },
  shell: {
    toggleDrawer: "إظهار/إخفاء القائمة",
    notImplemented: "هذه الشاشة قيد الإنشاء",
    notImplementedHint: "سيتم بناؤها في مرحلة لاحقة.",
    search: "بحث سريع في النظام",
    searchItemsGroup: "الأصناف",
    searchCustomersGroup: "العملاء",
    searchNoResults: "لا توجد نتائج مطابقة",
    searchViewAllItems: "عرض كل نتائج الأصناف",
    searchViewAllCustomers: "عرض كل نتائج العملاء",
    notifications: "الإشعارات",
    userMenu: "قائمة المستخدم",
    pharmacist: "صيدلي"
  },
  items: {
    listTitle: "الأصناف",
    add: "اضافة صنف",
    edit: "تعديل صنف",
    search: "بحث بالاسم أو الباركود",
    count: "عدد الأصناف",
    empty: "لا توجد أصناف",
    noResults: "لا توجد نتائج",
    loading: "جارٍ التحميل…",
    deactivate: "إيقاف",
    confirmDeactivate: "إيقاف هذا الصنف؟ لن يظهر في البحث ولن يُحذف.",
    tabs: {
      basic: "المعلومات الأساسية",
      pricing: "الأسعار و الوحدات",
      supplier: "بيانات مورد الصنف",
      settings: "اعدادات الصنف"
    },
    fields: {
      code: "مؤشر الصنف",
      itemType: "نوع الصنف",
      internationalCode: "الكود الدولي",
      nameAr: "اسم الصنف باللغة العربية",
      nameEn: "اسم الصنف باللغة الانجليزية",
      origin: "منشأ الصنف",
      originLocal: "محلي",
      originImported: "مستورد",
      manufacturer: "اسم الشركة المنتجة",
      itemNature: "طبيعة الصنف",
      scientificData: "بيانات علمية",
      scientificName: "الاسم العلمي",
      mainIngredient: "المادة الفعالة الأساسية",
      mainIngredientPct: "نسبة المادة الفعالة الأساسية %",
      noExpiry: "ليس له تاريخ صلاحية",
      scheduleClass: "صنف جدول",
      storageCondition: "صنف تخزين",
      requiresPrescription: "يتطلب روشتة",
      additionalData: "بيانات اضافية",
      shelfLocation: "مكان الصنف",
      publicPrice: "سعر الجمهور",
      minStock: "الحد الأدنى للمخزون",
      maxStock: "الحد الأقصى للمخزون",
      barcodes: "اضافة باركود اخر للصنف",
      barcode: "الباركود",
      scientificGroups: "المجموعات العلمية",
      units: "الوحدات",
      unitName: "الوحدة",
      unitFactor: "المعامل",
      unitPrice: "سعر البيع",
      unitIsBase: "الوحدة الأساسية",
      unitDefaultSale: "افتراضي للبيع"
    },
    schedule: {
      none: "غير مجدول",
      table1: "جدول ١",
      table2: "جدول ٢",
      table3: "جدول ٣"
    },
    storage: {
      room: "حرارة الغرفة",
      fridge: "ثلاجة",
      freezer: "فريزر"
    },
    actions: {
      save: "حفظ",
      cancel: "إلغاء",
      addRow: "إضافة سطر",
      removeRow: "حذف",
      back: "رجوع"
    },
    scan: {
      hint: "امسح الباركود بالماسح الضوئي لإضافته تلقائياً",
      added: "تمت إضافة الباركود {code}",
      duplicate: "الباركود {code} مضاف بالفعل",
      badCheckDigit: "تمت إضافة {code} — رقم التحقق غير صحيح، تأكد من صحة القراءة"
    },
    import: {
      title: "استيراد الأصناف",
      open: "استيراد من ملف",
      pickFile: "اختر ملف CSV أو Excel",
      file: "الملف",
      mapping: "مطابقة الأعمدة",
      mappingHint: "اختر العمود المقابل لكل حقل. الحقول غير المطلوبة يمكن تركها فارغة.",
      notMapped: "— غير محدد —",
      preview: "معاينة",
      totalRows: "إجمالي الصفوف",
      accepted: "صفوف صالحة",
      rejected: "صفوف مرفوضة",
      rejectedTitle: "الصفوف المرفوضة",
      rowNumber: "رقم الصف",
      reason: "السبب",
      exportRejects: "تصدير المرفوضات",
      exported: "تم حفظ الملف في {path}",
      apply: "تنفيذ الاستيراد",
      applying: "جارٍ الاستيراد…",
      progress: "{done} من {total}",
      done: "تم استيراد {count} صنف في {seconds} ثانية",
      doneWithRejects: "تم استيراد {count} صنف، ورُفض {rejected} صف",
      nothingToImport: "لا توجد صفوف صالحة للاستيراد",
      sampleTitle: "عينة من البيانات",
      moreRejects: "وأكثر… يتم عرض أول {shown} صف فقط",
      fields: {
        nameAr: "اسم الصنف بالعربية",
        nameEn: "اسم الصنف بالإنجليزية",
        barcode: "الباركود",
        publicPrice: "سعر الجمهور",
        scientificName: "الاسم العلمي",
        shelfLocation: "مكان الصنف",
        unitName: "اسم الوحدة",
        unitFactor: "معامل الوحدة",
        salePrice: "سعر البيع",
        minStock: "الحد الأدنى"
      },
      errors: {
        pickFailed: "تعذّر اختيار الملف",
        previewFailed: "تعذّر معاينة الملف",
        applyFailed: "فشل تنفيذ الاستيراد",
        exportFailed: "تعذّر تصدير المرفوضات"
      }
    },
    errors: {
      nameRequired: "اسم الصنف باللغة العربية مطلوب",
      duplicateBarcode: "هذا الباركود مستخدم بالفعل",
      duplicateBarcodeInForm: "هذا الباركود مكرر في نفس الصنف",
      needBaseUnit: "يجب تحديد وحدة أساسية واحدة بمعامل ١",
      multipleBaseUnits: "لا يمكن تحديد أكثر من وحدة أساسية واحدة",
      duplicateUnitName: 'اسم الوحدة "{name}" مكرر',
      invalidUnitFactor: 'معامل الوحدة "{name}" يجب أن يكون رقماً صحيحاً موجباً',
      priceAbovePublic: "سعر البيع لا يمكن أن يتجاوز سعر الجمهور",
      invalidNumber: "قيمة غير صالحة",
      mainIngredientPctInvalid: "نسبة المادة الفعالة يجب أن تكون رقماً بين 0 و100",
      maxStockBelowMin: "الحد الأقصى للمخزون لا يمكن أن يكون أقل من الحد الأدنى",
      saveFailed: "تعذّر الحفظ",
      loadFailed: "تعذّر تحميل الأصناف",
      deactivateFailed: "تعذّر إيقاف الصنف"
    }
  },
  warehouses: {
    title: "المخازن",
    add: "اضافة مخزن",
    edit: "تعديل مخزن",
    name: "اسم المخزن",
    isDefault: "المخزن الافتراضي",
    default: "افتراضي",
    empty: "لا توجد مخازن",
    confirmDeactivate: "إيقاف هذا المخزن؟",
    cannotDeactivateDefault: "لا يمكن إيقاف المخزن الافتراضي",
    errors: {
      nameRequired: "اسم المخزن مطلوب",
      loadFailed: "تعذّر تحميل المخازن",
      saveFailed: "تعذّر حفظ المخزن",
      deactivateFailed: "تعذّر إيقاف المخزن"
    }
  },
  suppliers: {
    title: "الموردون",
    add: "اضافة مورد",
    edit: "تعديل مورد",
    search: "بحث بالاسم",
    code: "مؤشر المورد",
    name: "اسم المورد",
    phone1: "رقم الهاتف 1",
    phone2: "رقم الهاتف 2",
    address: "العنوان",
    taxNumber: "الرقم الضريبي",
    openingBalance: "الرصيد الافتتاحي",
    balance: "الرصيد الحالي",
    paymentTermsDays: "مدة السداد (أيام)",
    empty: "لا يوجد موردون",
    noResults: "لا توجد نتائج",
    confirmDeactivate: "إيقاف هذا المورد؟",
    errors: {
      nameRequired: "اسم المورد مطلوب",
      negativePaymentTerms: "مدة السداد لا يمكن أن تكون سالبة",
      saveFailed: "فشل الحفظ"
    }
  },
  purchases: {
    title: "فواتير الشراء",
    add: "فاتورة شراء جديدة",
    list: "قائمة الفواتير",
    supplierInvoiceNo: "رقم فاتورة المورد",
    supplier: "المورد",
    supplierSearch: "ابحث عن مورد",
    warehouse: "المخزن",
    purchaseType: "نوع الشراء",
    cash: "كاش",
    credit: "آجل",
    invoiceDate: "تاريخ الفاتورة",
    dueDate: "تاريخ الاستحقاق",
    serial: "مسلسل الفاتورة",
    status: "الحالة",
    statusDraft: "مسودة",
    statusHeld: "معلقة",
    statusConfirmed: "مؤكدة",
    statusVoided: "ملغاة",
    expenses: "قيمة المصاريف",
    extraDiscountAmt: "قيمة الخصم الإضافي",
    extraDiscountPct: "نسبة الخصم الإضافي %",
    supplierBalance: "الرصيد الحالي للمورد",
    subtotal: "الإجمالي قبل الضريبة",
    taxTotal: "إجمالي الضريبة",
    total: "الاجمالي",
    notes: "ملاحظات",
    save: "حفظ كمسودة",
    confirm: "تأكيد الفاتورة",
    confirmWarning: "تأكيد الفاتورة يضيف الكميات إلى المخزون ولا يمكن التراجع عنه إلا بمرتجع.",
    confirmed: "تم تأكيد الفاتورة وإضافة الكميات إلى المخزون",
    voidInvoice: "إلغاء",
    confirmVoid: "إلغاء هذه الفاتورة؟",
    empty: "لا توجد فواتير شراء",
    noLines: "لا توجد أصناف في الفاتورة",
    itemSearch: "ابحث عن صنف",
    grid: {
      item: "الصنف",
      unit: "الوحدة",
      qty: "الكمية",
      bonus: "بونص",
      batchNumber: "رقم التشغيلة",
      expiryDate: "تاريخ الصلاحية",
      price: "سعر الشراء",
      beforeDiscount: "ق.خ",
      discount: "خصم %",
      afterDiscount: "ب.خ",
      tax: "ضريبة %",
      afterTax: "ب.ض",
      landedCost: "تكلفة الوحدة",
      remove: "حذف"
    },
    errors: {
      noSupplier: "يجب اختيار المورد",
      noWarehouse: "يجب اختيار المخزن",
      noLines: "يجب إضافة صنف واحد على الأقل",
      itemRequired: "الصنف مطلوب لكل سطر",
      qtyRequired: "الكمية يجب أن تكون أكبر من صفر",
      expiryRequired: "تاريخ الصلاحية مطلوب لهذا الصنف",
      confirmFailed: "فشل تأكيد الفاتورة",
      saveFailed: "فشل حفظ الفاتورة",
      loadFailed: "تعذّر تحميل فواتير الشراء"
    }
  },
  stock: {
    title: "المخزون حسب الصنف والتشغيلة",
    search: "بحث بالاسم",
    onHand: "الرصيد",
    stockValue: "قيمة المخزون",
    nearestExpiry: "أقرب صلاحية",
    batches: "التشغيلات",
    batchNumber: "رقم التشغيلة",
    expiryDate: "تاريخ الصلاحية",
    noExpiry: "بدون تاريخ صلاحية",
    unitCost: "تكلفة الوحدة",
    receivedAt: "تاريخ الاستلام",
    quarantined: "محجور",
    outOfStock: "نفذ من المخزون",
    empty: "لا توجد أصناف",
    noResults: "لا توجد نتائج",
    noBatches: "لا توجد تشغيلات لهذا الصنف",
    back: "رجوع للقائمة",
    moves: "حركة المخزون",
    moveTypeLabel: "نوع الحركة",
    qtyDelta: "الكمية",
    moveType: {
      purchase: "شراء",
      sale: "بيع",
      sale_return: "مرتجع بيع",
      purchase_return: "مرتجع شراء",
      adjustment: "تسوية",
      transfer_in: "تحويل وارد",
      transfer_out: "تحويل صادر",
      count: "جرد"
    },
    verifyLedger: "التحقق من السجل",
    ledgerMatches: "الرصيد يطابق السجل",
    ledgerMismatch: "تحذير: الرصيد لا يطابق مجموع الحركات",
    errors: {
      loadFailed: "تعذّر تحميل بيانات المخزون"
    }
  },
  sales: {
    title: "فواتير المبيعات",
    add: "فاتورة بيع جديدة",
    itemSearch: "امسح الباركود أو ابحث بالاسم",
    warehouse: "المخزن",
    invoiceType: "نوع الفاتورة",
    cash: "كاش",
    credit: "آجل",
    customer: "العميل",
    customerSearch: "ابحث عن عميل بالاسم أو رقم الموبايل",
    customerRequired: "مطلوب لفواتير الآجل",
    changeCustomer: "تغيير",
    serial: "مسلسل الفاتورة",
    status: "الحالة",
    qty: "الكمية",
    unitPrice: "السعر",
    beforeDiscount: "ق.خ",
    discount: "خصم (ج.م)",
    afterDiscount: "ب.خ",
    expiry: "الصلاحية",
    stock: "الرصيد",
    remove: "حذف",
    itemCount: "عدد الأصناف",
    subtotal: "الإجمالي",
    total: "الاجمالي",
    paidCash: "المدفوع كاش",
    change: "الباقي",
    confirmCash: "دفع نقداً",
    confirmCredit: "دفع آجل",
    hold: "تعليق",
    cancel: "إلغاء",
    emptyCart: "السلة فارغة — امسح صنفاً للبدء",
    noResults: "لا توجد نتائج",
    confirmed: "تم تأكيد الفاتورة رقم {serial}",
    empty: "لا توجد فواتير مبيعات",
    statusDraft: "مسودة",
    statusHeld: "معلقة",
    statusConfirmed: "مؤكدة",
    statusVoided: "ملغاة",
    errors: {
      noWarehouse: "يجب اختيار المخزن",
      noLines: "السلة فارغة",
      invalidQty: "يجب أن تكون الكمية أكبر من صفر لكل الأصناف في السلة",
      insufficientPaid: "المبلغ المدفوع أقل من الإجمالي",
      noCustomer: "يجب اختيار عميل لفواتير الآجل",
      saveFailed: "فشل حفظ الفاتورة",
      confirmFailed: "فشل تأكيد الفاتورة",
      outOfStock: "الكمية المطلوبة غير متوفرة في المخزون"
    }
  },
  shifts: {
    title: "تسليم الدرج",
    noOpenShift: "لا توجد وردية مفتوحة",
    openShift: "فتح وردية جديدة",
    openingFloat: "رصيد بداية الوردية",
    openedAt: "وقت الفتح",
    openedBy: "المستخدم",
    warehouse: "المخزن",
    cashSalesCount: "عدد فواتير الكاش",
    cashTotal: "إجمالي الكاش",
    creditTotal: "إجمالي الآجل",
    cashIn: "توريد نقدية",
    cashOut: "صرف نقدية",
    amount: "المبلغ",
    category: "الفئة",
    note: "ملاحظة",
    addTransaction: "إضافة حركة",
    transactionsTitle: "حركات نقدية خلال الوردية",
    transactionsLog: "سجل الحركات النقدية",
    expectedCash: "الرصيد المتوقع",
    countedCash: "الرصيد الفعلي (بالعد)",
    variance: "الفرق",
    varianceNote: "سبب الفرق",
    varianceRequired: "يجب كتابة سبب الفرق قبل إغلاق الوردية",
    handedTo: "تسليم إلى",
    closeShift: "إغلاق الوردية وتسليم الدرج",
    closed: "تم إغلاق الوردية بنجاح",
    zReport: "تقرير نهاية الوردية",
    status: "الحالة",
    open: "مفتوحة",
    closed_: "مغلقة",
    history: "سجل الورديات",
    errors: {
      alreadyOpen: "توجد وردية مفتوحة بالفعل لهذا المخزن",
      negativeAmount: "لا يمكن أن يكون المبلغ سالباً",
      openFailed: "فشل فتح الوردية",
      closeFailed: "فشل إغلاق الوردية",
      cashTxFailed: "فشل تسجيل الحركة النقدية"
    }
  },
  customers: {
    title: "العملاء",
    add: "اضافة عميل",
    edit: "تعديل عميل",
    search: "بحث بالاسم أو رقم الموبايل",
    code: "مؤشر العميل",
    name: "اسم العميل",
    mobile1: "رقم الموبايل 1",
    mobile2: "رقم الموبايل 2",
    email: "البريد الإلكتروني",
    accountType: "نوع حساب العميل",
    accountTypes: {
      individual: "فرد",
      pharmacy: "صيدلية",
      clinic: "عيادة",
      company: "شركة"
    },
    pharmacyOwnerName: "اسم صاحب الصيدلية",
    pharmacyPhone: "رقم هاتف الصيدلية",
    paymentMethod: "طريقة الدفع",
    cash: "كاش",
    credit: "آجل",
    openingBalance: "الرصيد الافتتاحي",
    creditLimit: "حد الائتمان",
    noLimit: "بدون حد",
    isVip: "عميل VIP",
    isSuspended: "إيقاف حساب العميل",
    sellAtCost: "البيع بسعر التكلفة",
    discountCashPct: "خصم الكاش %",
    discountCreditPct: "خصم الآجل %",
    discountInvoicePct: "خصم الفاتورة الكلي %",
    tags: "الوسوم",
    tagsHint: "اكتب تاج ثم اضغط إدخال",
    notes: "ملاحظات",
    balance: "الرصيد الحالي",
    empty: "لا يوجد عملاء",
    noResults: "لا توجد نتائج",
    confirmSuspend: "إيقاف حساب هذا العميل؟ لن يتمكن من الشراء بالآجل.",
    confirmDeactivate: "إيقاف هذا العميل نهائياً؟",
    suspend: "إيقاف الحساب",
    unsuspend: "إلغاء الإيقاف",
    suspended: "موقوف",
    reportsTitle: "تقارير العملاء",
    selectCustomer: "اختر عميلاً لعرض كشف الحساب",
    ledgerTitle: "كشف حساب العميل",
    recordPayment: "تسجيل دفعة",
    paymentAmount: "مبلغ الدفعة",
    paymentNote: "ملاحظة الدفعة",
    ledgerDate: "التاريخ",
    ledgerType: "نوع الحركة",
    ledgerDebit: "مدين",
    ledgerCredit: "دائن",
    ledgerBalance: "الرصيد بعد الحركة",
    entryTypes: {
      opening: "رصيد افتتاحي",
      sale: "بيع آجل",
      payment: "سداد",
      return: "مرتجع",
      adjustment: "تسوية"
    },
    errors: {
      nameRequired: "اسم العميل مطلوب",
      mobileRequired: "رقم الموبايل مطلوب",
      mobileInvalid: "رقم الموبايل غير صحيح (أرقام فقط، 8 أرقام على الأقل)",
      discountInvalid: "نسبة الخصم يجب أن تكون رقماً بين 0 و100",
      saveFailed: "فشل الحفظ",
      saveFailedValidation: "تحقق من البيانات المدخلة قبل الحفظ",
      paymentFailed: "فشل تسجيل الدفعة",
      loadFailed: "تعذّر تحميل العملاء",
      suspendFailed: "تعذّر تحديث حالة العميل"
    }
  },
  salesReturns: {
    titleByInvoice: "مرتجع فواتير البيع",
    titleGeneral: "مرتجع بيع عام",
    findInvoice: "ابحث برقم الفاتورة",
    invoiceSerial: "رقم الفاتورة",
    load: "تحميل",
    notFound: "الفاتورة غير موجودة",
    soldQty: "الكمية المباعة",
    alreadyReturned: "تم إرجاعه سابقاً",
    returnQty: "الكمية المرتجعة",
    unitPrice: "السعر",
    damaged: "تالف",
    refundMethod: "طريقة الاسترداد",
    cash: "نقداً",
    creditNote: "إشعار دائن",
    account: "خصم من حساب العميل",
    reason: "سبب الإرجاع",
    approvedBy: "موافقة المسؤول",
    approvalRequired: "المرتجع العام يتطلب موافقة المسؤول",
    overrideNote: "سبب تجاوز الحجر (للأصناف المبردة)",
    overrideRefrigerated: "إرجاع للمخزون القابل للبيع رغم أنه مبرد",
    quarantineNotice: "الأصناف المبردة تذهب للحجر الصحي تلقائياً ولا تُباع مرة أخرى إلا بموافقة وسبب موثق",
    itemSearch: "ابحث عن صنف",
    priceCapNotice: "السعر لا يمكن أن يتجاوز سعر الجمهور في المرتجع العام",
    batch: "التشغيلة",
    noBatch: "لا توجد تشغيلة لهذا الصنف في هذا المخزن",
    confirm: "تأكيد المرتجع",
    confirmed: "تم تأكيد المرتجع رقم {serial}",
    total: "الاجمالي",
    empty: "لا توجد مرتجعات",
    errors: {
      noLines: "لا توجد أصناف للإرجاع",
      qtyExceedsRemaining: "الكمية المرتجعة أكبر من المتاح للإرجاع",
      qtyNotWhole: "الكمية المرتجعة يجب أن تكون رقماً صحيحاً",
      accountNeedsCustomer: "الخصم من حساب العميل يتطلب وجود عميل على الفاتورة",
      priceAbovePublic: "السعر لا يمكن أن يتجاوز سعر الجمهور",
      negativePrice: "السعر لا يمكن أن يكون سالباً",
      noBatch: "لا توجد تشغيلة متاحة لأحد الأصناف",
      createFailed: "فشل إنشاء المرتجع"
    }
  },
  purchaseReturns: {
    titleByInvoice: "مرتجعات فواتير الشراء",
    titleGeneral: "مرتجعات شراء عام",
    findInvoice: "ابحث برقم فاتورة الشراء",
    invoiceSerial: "رقم فاتورة الشراء",
    load: "تحميل",
    notFound: "الفاتورة غير موجودة",
    receivedQty: "الكمية المستلمة",
    onHandQty: "الرصيد الحالي",
    alreadyReturned: "تم إرجاعه سابقاً",
    returnQty: "الكمية المرتجعة",
    unitCost: "تكلفة الوحدة",
    reason: "سبب الإرجاع",
    supplier: "المورد",
    supplierSearch: "ابحث عن مورد",
    itemSearch: "ابحث عن صنف",
    batch: "التشغيلة",
    confirm: "تأكيد المرتجع",
    confirmed: "تم تأكيد مرتجع الشراء رقم {serial}",
    total: "الاجمالي",
    empty: "لا توجد مرتجعات شراء",
    errors: {
      noLines: "لا توجد أصناف للإرجاع",
      noSupplier: "يجب اختيار المورد",
      qtyExceedsOnHand: "الكمية المرتجعة أكبر من الرصيد الحالي",
      qtyNotWhole: "الكمية المرتجعة يجب أن تكون رقماً صحيحاً",
      createFailed: "فشل إنشاء مرتجع الشراء"
    }
  },
  cashInOut: {
    title: "صرف وتوريد نقدية",
    noOpenShift: "لا توجد وردية مفتوحة. افتح وردية من شاشة تسليم الدرج أولاً.",
    goToShift: "الذهاب لشاشة تسليم الدرج",
    warehouse: "المخزن",
    currentShift: "الوردية الحالية",
    openedAt: "وقت الفتح",
    expectedCash: "الرصيد المتوقع الحالي",
    direction: "نوع الحركة",
    cashIn: "توريد نقدية",
    cashOut: "صرف نقدية",
    amount: "المبلغ",
    category: "الفئة",
    categories: {
      pettyCash: "مصاريف نثرية",
      safeTransfer: "تحويل للخزنة",
      safeTopup: "تغذية من الخزنة",
      refund: "استرداد",
      other: "أخرى"
    },
    note: "ملاحظة",
    submit: "تسجيل الحركة",
    history: "سجل الحركات اليوم",
    empty: "لا توجد حركات نقدية بعد",
    errors: {
      invalidAmount: "يجب إدخال مبلغ أكبر من صفر",
      shiftClosed: "تم إغلاق الوردية — أعد تحميل الشاشة",
      submitFailed: "فشل تسجيل الحركة"
    }
  },
  salesReport: {
    title: "تقارير المبيعات",
    fromDate: "من تاريخ",
    toDate: "إلى تاريخ",
    today: "اليوم",
    thisWeek: "هذا الأسبوع",
    thisMonth: "هذا الشهر",
    invoiceCount: "عدد الفواتير",
    cashTotal: "إجمالي الكاش",
    creditTotal: "إجمالي الآجل",
    subtotal: "الإجمالي قبل الخصم",
    discountTotal: "إجمالي الخصومات",
    grandTotal: "الاجمالي الكلي",
    costTotal: "إجمالي التكلفة",
    grossProfit: "إجمالي الربح",
    invoiceList: "قائمة الفواتير",
    serial: "رقم الفاتورة",
    type: "النوع",
    total: "الاجمالي",
    profit: "الربح",
    confirmedAt: "وقت التأكيد",
    cash: "كاش",
    credit: "آجل",
    empty: "لا توجد فواتير في هذه الفترة",
    apply: "تطبيق",
    errors: {
      loadFailed: "تعذّر تحميل تقرير المبيعات",
      invalidRange: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية"
    }
  },
  expiryReport: {
    title: "لوحة الصلاحية",
    asOf: "حتى تاريخ",
    apply: "تطبيق",
    bucketExpired: "منتهي الصلاحية",
    /** {days}: the first bucket, from today through the configured d30 threshold. */
    bucketWithin: "خلال {days} يوم",
    /** {from}/{to}: a middle bucket, the range strictly between two configured thresholds. */
    bucketBetween: "من {from} إلى {to} يوم",
    /** {days}: the last bucket, beyond the configured d180 threshold. */
    bucketOver: "أكثر من {days} يوم",
    allBuckets: "كل الفئات",
    batchCount: "عدد الدفعات",
    qtyOnHand: "الكمية",
    value: "القيمة بالتكلفة",
    tableTitle: "الدفعات",
    code: "الكود",
    itemName: "الصنف",
    batchNumber: "رقم الدفعة",
    expiryDate: "تاريخ الصلاحية",
    unitCost: "تكلفة الوحدة",
    warehouseId: "المخزن",
    empty: "لا توجد دفعات في هذه الفئة",
    errors: {
      loadFailed: "تعذّر تحميل لوحة الصلاحية"
    }
  },
  settings: {
    title: "الإعدادات العامة",
    save: "حفظ الإعدادات",
    saved: "تم حفظ الإعدادات",
    loadFailed: "تعذّر تحميل الإعدادات",
    saveFailed: "تعذّر حفظ الإعدادات",
    expirySection: "حدود لوحة الصلاحية (بالأيام)",
    expiryHint: "تُستخدم هذه الحدود في تقسيم لوحة الصلاحية إلى فئات. يجب أن تكون متصاعدة.",
    expiryD30: "الفئة الأولى (خلال)",
    expiryD60: "الفئة الثانية (خلال)",
    expiryD90: "الفئة الثالثة (خلال)",
    expiryD180: "الفئة الرابعة (خلال)",
    expiryOrderError: "يجب أن تكون الحدود متصاعدة: الفئة الأولى < الثانية < الثالثة < الرابعة",
    returnsSection: "سياسة المرتجعات",
    returnWindowDays: "مهلة مرتجع فواتير البيع (بالأيام)",
    returnWindowHint: "أقصى عدد أيام بعد تأكيد فاتورة البيع يمكن خلالها عمل مرتجع بفاتورة. لا ينطبق على المرتجع العام.",
    returnWindowError: "مهلة المرتجع يجب أن تكون رقماً صحيحاً موجباً",
    scannerSection: "إعدادات قارئ الباركود",
    scannerHint: "هذه الإعدادات خاصة بهذا الجهاز ولا تتم مزامنتها مع الأجهزة الأخرى.",
    scannerLengthOrderError: "أقل طول للباركود يجب أن يكون أصغر من أو يساوي أقصى طول",
    scannerPositiveError: "قيم إعدادات القارئ يجب أن تكون أكبر من صفر",
    scannerTerminator: "نهاية القراءة",
    scannerTerminatorEnter: "Enter",
    scannerTerminatorTab: "Tab",
    scannerTerminatorNone: "بدون (وضع التوقيت)",
    scannerMinLength: "أقل طول للباركود",
    scannerMaxLength: "أقصى طول للباركود",
    scannerMaxIntervalMs: "أقصى فاصل بين الأحرف (مللي ثانية)",
    scannerDebounceMs: "مهلة تجاهل التكرار (مللي ثانية)",
    scannerTest: "اختبار القارئ",
    scannerTestWaiting: "امسح أي باركود الآن…",
    scannerTestOk: "تم استقبال الباركود بنجاح",
    scannerTestFailed: "لم يتم استقبال أي باركود",
    scannerReset: "إعادة تعيين إعدادات القارئ"
  },
  dashboard: {
    title: "الرئيسية",
    todaySales: "مبيعات اليوم",
    todayInvoices: "عدد فواتير اليوم",
    todayProfit: "الربح المتوقع اليوم",
    lowStockList: "أصناف تحتاج إعادة طلب",
    noLowStock: "لا توجد أصناف منخفضة المخزون حالياً",
    openShift: "الوردية المفتوحة",
    noOpenShift: "لا توجد وردية مفتوحة الآن",
    expectedCash: "الرصيد النقدي المتوقع",
    quickLinks: "اختصارات سريعة",
    viewAll: "عرض الكل",
    loadFailed: "تعذر تحميل بيانات لوحة التحكم",
    retry: "إعادة المحاولة",
    warehouseFilter: "المخزن",
    operationsSection: "العمليات التشغيلية",
    financialSection: "الملخص المالي",
    salesTrend: "أداء المبيعات",
    lastNDays: "آخر {n} أيام",
    salesTrendFailed: "تعذر تحميل اتجاه المبيعات",
    recentTransactions: "آخر العمليات",
    noTransactions: "لا توجد عمليات حتى الآن",
    minutesAgo: "منذ {n} دقيقة",
    hoursAgo: "منذ {n} ساعة",
    daysAgo: "منذ {n} يوم",
    justNow: "الآن",
    cashSnapshot: "الحركة النقدية اليوم",
    cashSalesLabel: "مبيعات نقدية",
    cashInLabel: "توريد نقدية",
    cashOutLabel: "صرف نقدية",
    netCashLabel: "صافي الحركة",
    receivables: "مستحقات العملاء",
    receivablesHint: "عميلاً لديهم رصيد مستحق",
    noReceivables: "لا توجد مستحقات على العملاء حالياً"
  },
  status: {
    connectionOk: "الاتصال سليم",
    connectionFailed: "فشل الاتصال",
    connecting: "جارٍ الاتصال بقاعدة البيانات…",
    sqliteVersion: "إصدار SQLite",
    migrations: "الترحيلات المطبقة",
    journalMode: "وضع السجل",
    foreignKeys: "المفاتيح الخارجية",
    enabled: "مفعّلة",
    disabled: "معطّلة",
    databasePath: "مسار قاعدة البيانات",
    noBridge: "لا يمكن الوصول إلى قاعدة البيانات من المتصفح. افتح التطبيق عبر Electron باستخدام npm run dev."
  }
};
function Base({ children, className, ...rest }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 24 24", className: className ? `icon ${className}` : "icon", "aria-hidden": "true", ...rest, children });
}
function MenuIcon(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Base, { ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 6h18M3 12h18M3 18h18" }) });
}
function SearchIcon(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Base, { ...props, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "11", cy: "11", r: "7" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M21 21l-4.3-4.3" })
  ] });
}
function BellIcon(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Base, { ...props, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M13.73 21a2 2 0 0 1-3.46 0" })
  ] });
}
function PillIcon(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Base, { ...props, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "3.5", y: "8.5", width: "17", height: "7", rx: "3.5", transform: "rotate(-45 12 12)" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M8 8l8 8" })
  ] });
}
function InboxIcon(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Base, { ...props, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M22 12h-6l-2 3h-4l-2-3H2" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" })
  ] });
}
function AlertCircleIcon(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Base, { ...props, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "12", r: "9" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 8v5" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 16h.01" })
  ] });
}
function RefreshIcon(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Base, { ...props, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M21 12a9 9 0 1 1-2.64-6.36" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M21 4v6h-6" })
  ] });
}
function ChevronDownIcon(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Base, { ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M6 9l6 6 6-6" }) });
}
function ReceiptIcon(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Base, { ...props, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M6 2h12v19l-3-2-2 2-2-2-2 2-3-2Z" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M9 7h6M9 11h6" })
  ] });
}
function TrendingUpIcon(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Base, { ...props, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 17l6-6 4 4 8-8" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M15 6h6v6" })
  ] });
}
function BoxIcon(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Base, { ...props, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M21 8 12 3 3 8v8l9 5 9-5Z" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 8l9 5 9-5" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 13v8" })
  ] });
}
function ClockIcon(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Base, { ...props, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "12", r: "9" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 7v5l3 3" })
  ] });
}
function WalletIcon(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Base, { ...props, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1h-4a2 2 0 0 0 0 4h5" })
  ] });
}
function ArrowLeftIcon(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Base, { ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M19 12H5M11 6l-6 6 6 6" }) });
}
function LayersIcon(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Base, { ...props, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 3 3 8l9 5 9-5-9-5Z" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 13l9 5 9-5" })
  ] });
}
function UsersIcon(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Base, { ...props, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "9", cy: "8", r: "3.5" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M16.5 4.5c1.7.4 3 1.9 3 3.7 0 1.7-1.1 3.1-2.6 3.6" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M18 14c2.2.5 3.5 2 3.5 4.3" })
  ] });
}
function TruckIcon(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Base, { ...props, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M2 7h11v9H2z" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M13 10h4l4 3v3h-8z" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "6.5", cy: "18", r: "1.7" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "16.5", cy: "18", r: "1.7" })
  ] });
}
function HomeIcon(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Base, { ...props, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 11.5 12 4l9 7.5" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M5.5 10v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M9.5 20v-6h5v6" })
  ] });
}
function SettingsIcon(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Base, { ...props, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "12", r: "3" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" })
  ] });
}
const RESULT_LIMIT = 5;
function Toolbar({ onToggleDrawer, onSearchNavigate }) {
  const [query, setQuery] = reactExports.useState("");
  const [items, setItems] = reactExports.useState([]);
  const [customers, setCustomers] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [open, setOpen] = reactExports.useState(false);
  const [activeIndex, setActiveIndex] = reactExports.useState(-1);
  const wrapRef = reactExports.useRef(null);
  const debounce = reactExports.useRef();
  const flatResults = [
    ...items.map((row) => ({ kind: "item", row })),
    ...customers.map((row) => ({ kind: "customer", row }))
  ];
  reactExports.useEffect(() => {
    if (!window.api || !query.trim()) {
      setItems([]);
      setCustomers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      void Promise.all([
        window.api.items.search(query, RESULT_LIMIT),
        window.api.customers.search(query, RESULT_LIMIT)
      ]).then(([itemResults, customerResults]) => {
        setItems(itemResults);
        setCustomers(customerResults);
      }).finally(() => setLoading(false));
    }, 120);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);
  reactExports.useEffect(() => setActiveIndex(-1), [query]);
  reactExports.useEffect(() => {
    function onPointerDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);
  function goToItem(row) {
    setOpen(false);
    onSearchNavigate("items.list", row.nameAr);
  }
  function goToCustomer(row) {
    setOpen(false);
    onSearchNavigate("customers.list", row.name);
  }
  function selectFlat(index) {
    const entry = flatResults[index];
    if (!entry) return;
    if (entry.kind === "item") goToItem(entry.row);
    else goToCustomer(entry.row);
  }
  function onKeyDown(e) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || flatResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flatResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => i <= 0 ? flatResults.length - 1 : i - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectFlat(activeIndex === -1 ? 0 : activeIndex);
    }
  }
  const hasQuery = query.trim().length > 0;
  const hasResults = items.length > 0 || customers.length > 0;
  let flatCursor = -1;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "header", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        className: "header__toggle",
        onClick: onToggleDrawer,
        title: ar.shell.toggleDrawer,
        "aria-label": ar.shell.toggleDrawer,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(MenuIcon, {})
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "header__brand", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "header__logo", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PillIcon, { className: "icon--sm" }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "header__search", ref: wrapRef, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "header__search-icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SearchIcon, { className: "icon--sm" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "field",
          placeholder: ar.shell.search,
          value: query,
          onChange: (e) => {
            setQuery(e.target.value);
            setOpen(true);
          },
          onFocus: () => hasQuery && setOpen(true),
          onKeyDown,
          role: "combobox",
          "aria-expanded": open,
          "aria-autocomplete": "list"
        }
      ),
      open && hasQuery && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "header-search-panel", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "header-search-panel__status", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "skeleton", style: { display: "block", blockSize: "1rem", borderRadius: "var(--radius-xs)" } }) }) : !hasResults ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "header-search-panel__status", children: ar.shell.searchNoResults }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        items.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "header-search-panel__group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "header-search-panel__group-label", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(BoxIcon, { className: "icon--sm" }),
            ar.shell.searchItemsGroup
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { children: items.map((row) => {
            flatCursor += 1;
            const isActive = flatCursor === activeIndex;
            return /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                className: isActive ? "header-search-result header-search-result--active" : "header-search-result",
                onMouseEnter: () => setActiveIndex(flatCursor),
                onClick: () => goToItem(row),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "header-search-result__title", children: row.nameAr }),
                  row.publicPrice !== null && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "header-search-result__meta", dir: "ltr", children: fromPiastres(row.publicPrice) })
                ]
              }
            ) }, row.id);
          }) })
        ] }),
        customers.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "header-search-panel__group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "header-search-panel__group-label", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(UsersIcon, { className: "icon--sm" }),
            ar.shell.searchCustomersGroup
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { children: customers.map((row) => {
            flatCursor += 1;
            const isActive = flatCursor === activeIndex;
            return /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                className: isActive ? "header-search-result header-search-result--active" : "header-search-result",
                onMouseEnter: () => setActiveIndex(flatCursor),
                onClick: () => goToCustomer(row),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "header-search-result__title", children: row.name }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "header-search-result__meta", dir: "ltr", children: row.mobile1 })
                ]
              }
            ) }, row.id);
          }) })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "header__spacer" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "header__actions", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "header__toggle", title: ar.shell.notifications, "aria-label": ar.shell.notifications, children: /* @__PURE__ */ jsxRuntimeExports.jsx(BellIcon, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "header__user", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "header__user-avatar", children: "ص" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "header__user-name", children: ar.shell.pharmacist })
      ] })
    ] })
  ] });
}
const MODULES = [
  {
    id: "sales",
    label: ar.modules.sales,
    shortcut: { code: "KeyN", ctrl: true, shift: true },
    target: "sales.invoices"
  },
  {
    id: "returns",
    label: ar.modules.returns,
    shortcut: { code: "KeyU", ctrl: true, shift: true },
    target: "sales.returnByInvoice"
  },
  {
    id: "purchases",
    label: ar.modules.purchases,
    shortcut: { code: "KeyP", ctrl: true, shift: true },
    target: "purchases.invoices"
  },
  {
    id: "items",
    label: ar.modules.items,
    shortcut: { code: "KeyT", ctrl: true, shift: true },
    target: "items.list"
  },
  {
    id: "customers",
    label: ar.modules.customers,
    shortcut: { code: "KeyC", ctrl: true, shift: true },
    target: "customers.list"
  },
  {
    id: "log",
    label: ar.modules.log,
    shortcut: { code: "KeyH", ctrl: true },
    target: "log"
  }
];
const DRAWER_TREE = [
  {
    label: ar.drawer.customers,
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(UsersIcon, { className: "icon--sm" }),
    children: [
      { label: ar.drawer.customersList, screen: "customers.list" },
      { label: ar.drawer.customersReports, screen: "customers.reports" }
    ]
  },
  {
    label: ar.drawer.items,
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(BoxIcon, { className: "icon--sm" }),
    children: [
      { label: ar.drawer.itemsList, screen: "items.list" },
      { label: ar.drawer.itemsStock, screen: "items.stock" },
      { label: ar.drawer.itemsExpiry, screen: "items.expiry" },
      { label: ar.drawer.itemsIbnSina, screen: "items.ibnSina" }
    ]
  },
  {
    label: ar.drawer.warehouses,
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(LayersIcon, { className: "icon--sm" }),
    children: [{ label: ar.drawer.warehousesList, screen: "warehouses" }]
  },
  {
    label: ar.drawer.sales,
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ReceiptIcon, { className: "icon--sm" }),
    children: [
      { label: ar.drawer.salesInvoices, screen: "sales.invoices" },
      { label: ar.drawer.salesShiftHandover, screen: "sales.shiftHandover" },
      { label: ar.drawer.salesReturnByInvoice, screen: "sales.returnByInvoice" },
      { label: ar.drawer.salesReturnGeneral, screen: "sales.returnGeneral" },
      { label: ar.drawer.salesReports, screen: "sales.reports" }
    ]
  },
  {
    label: ar.drawer.purchases,
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(TruckIcon, { className: "icon--sm" }),
    children: [
      { label: ar.drawer.purchaseInvoices, screen: "purchases.invoices" },
      { label: ar.drawer.suppliersList, screen: "suppliers.list" },
      { label: ar.drawer.purchaseReturnByInvoice, screen: "purchases.returnByInvoice" },
      { label: ar.drawer.purchaseReturnGeneral, screen: "purchases.returnGeneral" }
    ]
  },
  {
    label: ar.drawer.accounts,
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(WalletIcon, { className: "icon--sm" }),
    children: [{ label: ar.drawer.cashInOut, screen: "accounts.cashInOut" }]
  },
  {
    label: ar.drawer.settings,
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsIcon, { className: "icon--sm" }),
    children: [
      { label: ar.drawer.settingsGeneral, screen: "settings.general" },
      { label: ar.drawer.settingsConnection, screen: "health" }
    ]
  }
];
const SCREEN_LABELS = {
  dashboard: ar.dashboard.title,
  "sales.invoices": ar.drawer.salesInvoices,
  "sales.shiftHandover": ar.drawer.salesShiftHandover,
  "sales.returnByInvoice": ar.drawer.salesReturnByInvoice,
  "sales.returnGeneral": ar.drawer.salesReturnGeneral,
  "sales.reports": ar.drawer.salesReports,
  "purchases.invoices": ar.drawer.purchaseInvoices,
  "purchases.returnByInvoice": ar.drawer.purchaseReturnByInvoice,
  "purchases.returnGeneral": ar.drawer.purchaseReturnGeneral,
  "suppliers.list": ar.drawer.suppliersList,
  "items.stock": ar.drawer.itemsStock,
  "items.list": ar.drawer.itemsList,
  "items.ibnSina": ar.drawer.itemsIbnSina,
  "items.expiry": ar.drawer.itemsExpiry,
  "customers.list": ar.drawer.customersList,
  "customers.reports": ar.drawer.customersReports,
  warehouses: ar.drawer.warehouses,
  "accounts.cashInOut": ar.drawer.cashInOut,
  "settings.general": ar.drawer.settingsGeneral,
  log: ar.modules.log,
  health: ar.status.connectionOk
};
const COLLAPSED_KEY = "ui.drawerCollapsedGroups";
function readCollapsed() {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : /* @__PURE__ */ new Set();
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
function Node({
  node,
  activeScreen,
  onNavigate,
  collapsed,
  onToggle
}) {
  if (!node.children) {
    const active = node.screen === activeScreen;
    return /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        className: active ? "sidebar__leaf sidebar__leaf--active" : "sidebar__leaf",
        onClick: () => node.screen && onNavigate(node.screen),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sidebar__leaf-dot", "aria-hidden": "true" }),
          node.label
        ]
      }
    ) });
  }
  const isCollapsed = collapsed.has(node.label);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        className: "sidebar__group",
        onClick: () => onToggle(node.label),
        "aria-expanded": !isCollapsed,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "sidebar__group-label", children: [
            node.icon && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sidebar__group-icon", children: node.icon }),
            node.label
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: isCollapsed ? "sidebar__group-chevron sidebar__group-chevron--collapsed" : "sidebar__group-chevron",
              "aria-hidden": "true",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDownIcon, {})
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: isCollapsed ? "sidebar__children-wrap sidebar__children-wrap--collapsed" : "sidebar__children-wrap", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sidebar__children-inner", children: /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "sidebar__children", children: node.children.map((child) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      Node,
      {
        node: child,
        activeScreen,
        onNavigate,
        collapsed,
        onToggle
      },
      child.label + (child.screen ?? "")
    )) }) }) })
  ] });
}
function Drawer({ open, activeScreen, onNavigate }) {
  const [collapsed, setCollapsed] = reactExports.useState(() => readCollapsed());
  reactExports.useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsed]));
    } catch {
    }
  }, [collapsed]);
  if (!open) return null;
  function toggle(label) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "sidebar", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        className: activeScreen === "dashboard" ? "sidebar__root sidebar__root--active" : "sidebar__root",
        onClick: () => onNavigate("dashboard"),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sidebar__root-icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx(HomeIcon, { className: "icon--sm" }) }),
          ar.drawer.home
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "sidebar__tree", children: DRAWER_TREE.map((node) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      Node,
      {
        node,
        activeScreen,
        onNavigate,
        collapsed,
        onToggle: toggle
      },
      node.label
    )) })
  ] });
}
function Placeholder({ screen }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "placeholder", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "placeholder__icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx(InboxIcon, { className: "icon--lg" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: SCREEN_LABELS[screen] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: ar.shell.notImplemented }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted small", children: ar.shell.notImplementedHint }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("code", { dir: "ltr", children: screen })
  ] });
}
function HealthCheck() {
  const [state, setState] = reactExports.useState({ status: "loading" });
  reactExports.useEffect(() => {
    if (!window.api) {
      setState({ status: "error", message: ar.status.noBridge });
      return;
    }
    window.api.ping().then((result2) => setState({ status: "ok", result: result2 })).catch((err) => setState({ status: "error", message: err.message }));
  }, []);
  if (state.status === "loading") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: ar.status.connecting });
  }
  if (state.status === "error") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card error", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { style: { display: "flex", alignItems: "center", gap: "var(--space-2)" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertCircleIcon, { className: "icon--sm", style: { color: "var(--error-500)" } }),
        ar.status.connectionFailed
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { children: state.message })
    ] });
  }
  const { result } = state;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: ar.status.connectionOk }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: ar.status.sqliteVersion }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { dir: "ltr", children: result.sqliteVersion }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: ar.status.migrations }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { dir: "ltr", children: result.migrations.join(", ") || "—" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: ar.status.journalMode }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { dir: "ltr", children: result.journalMode }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: ar.status.foreignKeys }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: result.foreignKeys ? ar.status.enabled : ar.status.disabled }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: ar.status.databasePath }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { dir: "ltr", className: "path", children: result.databasePath })
    ] })
  ] });
}
function EmptyState({ title, hint, action }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "empty-state", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "empty-state__icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx(InboxIcon, { className: "icon--lg" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "empty-state__title", children: title }),
    hint && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "empty-state__hint", children: hint }),
    action
  ] });
}
function TableSkeleton({ rows = 5, cols = 4 }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "skeleton-table", children: Array.from({ length: rows }).map((_, r2) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "skeleton-table__row", children: Array.from({ length: cols }).map((_2, c) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "skeleton skeleton-table__cell" }, c)) }, r2)) });
}
const WIDTH = 640;
const HEIGHT = 140;
const PAD_X = 8;
const PAD_TOP = 20;
const PAD_BOTTOM = 28;
const BAR_GAP_RATIO = 0.35;
const COLOR_STOPS = [
  [223, 233, 255],
  // primary-100 — quiet day
  [91, 133, 247],
  // primary-400 — typical day
  [33, 69, 199]
  // primary-600 — peak day
];
function lerp(a, b, t2) {
  return Math.round(a + (b - a) * t2);
}
function rampColor(t2) {
  const clamped = Math.min(1, Math.max(0, t2));
  const segments = COLOR_STOPS.length - 1;
  const pos = clamped * segments;
  const i = Math.min(Math.floor(pos), segments - 1);
  const localT = pos - i;
  const [r1, g1, b1] = COLOR_STOPS[i];
  const [r2, g2, b2] = COLOR_STOPS[i + 1];
  return `rgb(${lerp(r1, r2, localT)}, ${lerp(g1, g2, localT)}, ${lerp(b1, b2, localT)})`;
}
function labelStride(n2) {
  return Math.max(1, Math.ceil(n2 / 10));
}
function SalesSparkline({ points }) {
  if (points.length < 2) return null;
  const values = points.map((p2) => p2.value);
  const max = Math.max(...values, 1);
  const plotW = WIDTH - PAD_X * 2;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const slot = plotW / points.length;
  const barW = slot * (1 - BAR_GAP_RATIO);
  const bars = points.map((p2, i) => {
    const barH = max > 0 ? p2.value / max * plotH : 0;
    const x2 = PAD_X + i * slot + (slot - barW) / 2;
    const y2 = PAD_TOP + plotH - barH;
    const cx = x2 + barW / 2;
    const ratio = p2.value / max;
    const gradientId = `dash-chart-bar-${i}`;
    return { x: x2, y: y2, cx, barH, ratio, gradientId, ...p2 };
  });
  const stride = labelStride(bars.length);
  const peakIndex = values.indexOf(max);
  const lastIndex = bars.length - 1;
  const labelIndices = /* @__PURE__ */ new Set([peakIndex, lastIndex]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "svg",
    {
      className: "dash-chart",
      viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
      preserveAspectRatio: "none",
      role: "img",
      "aria-label": "اتجاه المبيعات خلال آخر أيام",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("defs", { children: bars.map((b) => {
          const tone = rampColor(b.ratio);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("linearGradient", { id: b.gradientId, x1: "0", y1: "0", x2: "0", y2: "1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("stop", { offset: "0%", stopColor: tone, stopOpacity: "1" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("stop", { offset: "100%", stopColor: tone, stopOpacity: "0.55" })
          ] }, b.gradientId);
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "line",
          {
            x1: PAD_X,
            y1: HEIGHT - PAD_BOTTOM,
            x2: WIDTH - PAD_X,
            y2: HEIGHT - PAD_BOTTOM,
            stroke: "var(--border-default)",
            strokeWidth: "1"
          }
        ),
        bars.map((b, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "rect",
          {
            x: b.x,
            y: b.y,
            width: Math.max(barW, 1),
            height: Math.max(b.barH, 0),
            rx: Math.min(3, barW / 3),
            fill: `url(#${b.gradientId})`
          },
          i
        )),
        bars.map(
          (b, i) => labelIndices.has(i) && b.value > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "text",
            {
              x: b.cx,
              y: Math.max(b.y - 6, PAD_TOP - 6),
              textAnchor: b.cx > WIDTH - 40 ? "end" : b.cx < 40 ? "start" : "middle",
              fontSize: "11",
              fill: rampColor(b.ratio),
              fontWeight: "700",
              children: b.displayValue
            },
            `v-${i}`
          ) : null
        ),
        bars.map(
          (b, i) => i % stride === 0 || i === lastIndex ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "text",
            {
              x: b.cx,
              y: HEIGHT - 8,
              textAnchor: i === lastIndex ? "end" : i === 0 ? "start" : "middle",
              fontSize: "10",
              fill: "var(--text-tertiary)",
              children: b.label
            },
            `l-${i}`
          ) : null
        )
      ]
    }
  );
}
const TREND_PRESETS = [7, 14, 30];
function todayIso$2() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function daysAgoIso$1(days) {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
function daySpan(from, to) {
  const a = (/* @__PURE__ */ new Date(from + "T00:00:00")).getTime();
  const b = (/* @__PURE__ */ new Date(to + "T00:00:00")).getTime();
  return Math.floor((b - a) / 864e5) + 1;
}
function addDaysIso(iso, days) {
  const d = /* @__PURE__ */ new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function shortDateLabel(iso) {
  const d = /* @__PURE__ */ new Date(iso + "T00:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}`;
}
async function isolated(fn) {
  try {
    return await fn();
  } catch {
    return null;
  }
}
const WEEKDAY_SHORT = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
function relativeTime(iso) {
  const then = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z").getTime();
  const now = Date.now();
  const diffMin = Math.max(0, Math.floor((now - then) / 6e4));
  if (diffMin < 1) return ar.dashboard.justNow;
  if (diffMin < 60) return ar.dashboard.minutesAgo.replace("{n}", String(diffMin));
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return ar.dashboard.hoursAgo.replace("{n}", String(diffHr));
  const diffDay = Math.floor(diffHr / 24);
  return ar.dashboard.daysAgo.replace("{n}", String(diffDay));
}
const QUICK_LINKS = [
  { label: ar.drawer.salesInvoices, target: "sales.invoices", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ReceiptIcon, {}) },
  { label: ar.drawer.itemsList, target: "items.list", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(BoxIcon, {}) },
  { label: ar.drawer.itemsExpiry, target: "items.expiry", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ClockIcon, {}) },
  { label: ar.drawer.itemsStock, target: "items.stock", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(LayersIcon, {}) },
  { label: ar.drawer.purchaseInvoices, target: "purchases.invoices", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(TruckIcon, {}) },
  { label: ar.drawer.customersList, target: "customers.list", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(UsersIcon, {}) }
];
function Dashboard({ onNavigate }) {
  const [base, setBase] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [warehouseId, setWarehouseId] = reactExports.useState(null);
  const [shiftState, setShiftState] = reactExports.useState(null);
  const [shiftLoading, setShiftLoading] = reactExports.useState(false);
  const [trendFrom, setTrendFrom] = reactExports.useState(daysAgoIso$1(6));
  const [trendTo, setTrendTo] = reactExports.useState(todayIso$2());
  const [trend, setTrend] = reactExports.useState([]);
  const [trendLoading, setTrendLoading] = reactExports.useState(true);
  const [trendError, setTrendError] = reactExports.useState(false);
  const trendRangeInvalid = trendFrom > trendTo;
  const activeTrendPreset = TREND_PRESETS.find((n2) => trendFrom === daysAgoIso$1(n2 - 1) && trendTo === todayIso$2());
  function applyTrendPreset(days) {
    setTrendFrom(daysAgoIso$1(days - 1));
    setTrendTo(todayIso$2());
  }
  async function loadBase() {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const today = todayIso$2();
      const [salesSummary, lowStock, warehouses, recentAll, receivables] = await Promise.all([
        window.api.salesReport.summary(today, today),
        window.api.stock.lowStock(5),
        window.api.warehouses.list(),
        isolated(() => window.api.sales.list({ limit: 20 })),
        isolated(() => window.api.customers.receivablesSummary())
      ]);
      setBase({
        todayInvoiceCount: salesSummary.invoiceCount,
        todaySalesTotal: salesSummary.grandTotal,
        todayProfit: salesSummary.grossProfit,
        lowStockCount: lowStock.length,
        lowStockSample: lowStock.slice(0, 5).map((r2) => ({
          itemId: r2.itemId,
          nameAr: r2.nameAr,
          qtyOnHand: r2.qtyOnHand
        })),
        recentInvoices: (recentAll ?? []).filter((inv) => inv.status === "confirmed").slice(0, 5),
        receivables,
        warehouses
      });
      const defaultWarehouse = warehouses.find((w2) => w2.isDefault) ?? warehouses[0] ?? null;
      setWarehouseId((current) => current ?? defaultWarehouse?.id ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    void loadBase();
  }, []);
  reactExports.useEffect(() => {
    if (!window.api || warehouseId == null) {
      setShiftState(null);
      return;
    }
    let cancelled = false;
    setShiftLoading(true);
    void (async () => {
      const today = todayIso$2();
      const [cashSalesToday, shiftInfo] = await Promise.all([
        isolated(() => window.api.salesReport.summary(today, today)),
        isolated(async () => {
          const openShift = await window.api.shifts.getOpen(warehouseId);
          if (!openShift) return null;
          const [expected, transactions] = await Promise.all([
            window.api.shifts.computeExpectedCash(openShift.id),
            window.api.shifts.cashTransactions(openShift.id)
          ]);
          return { expected, transactions };
        })
      ]);
      if (cancelled) return;
      if (!shiftInfo) {
        setShiftState({ shiftOpen: false, expectedCash: null, cash: null });
      } else {
        setShiftState({
          shiftOpen: true,
          expectedCash: shiftInfo.expected,
          cash: {
            cashSales: cashSalesToday?.cashTotal ?? 0,
            cashIn: shiftInfo.transactions.filter((t2) => t2.direction === "in").reduce((s, t2) => s + t2.amount, 0),
            cashOut: shiftInfo.transactions.filter((t2) => t2.direction === "out").reduce((s, t2) => s + t2.amount, 0)
          }
        });
      }
      setShiftLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [warehouseId]);
  reactExports.useEffect(() => {
    if (!window.api || trendRangeInvalid) return;
    let cancelled = false;
    setTrendLoading(true);
    setTrendError(false);
    void (async () => {
      try {
        const points = await window.api.salesReport.trend(trendFrom, trendTo);
        if (cancelled) return;
        const byDate = new Map(points.map((p2) => [p2.date, p2]));
        const span = daySpan(trendFrom, trendTo);
        const useShortDate = span > 14;
        const filled = Array.from({ length: span }).map((_, i) => {
          const d = addDaysIso(trendFrom, i);
          const label = useShortDate ? shortDateLabel(d) : WEEKDAY_SHORT[(/* @__PURE__ */ new Date(d + "T00:00:00")).getDay()];
          return { dateIso: d, label, total: byDate.get(d)?.grandTotal ?? 0 };
        });
        setTrend(filled);
      } catch {
        if (!cancelled) setTrendError(true);
      } finally {
        if (!cancelled) setTrendLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trendFrom, trendTo, trendRangeInvalid]);
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stack", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "dash-hero", children: Array.from({ length: 3 }).map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "skeleton", style: { blockSize: "5.5rem", borderRadius: "var(--radius-lg)" } }, i)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "skeleton", style: { display: "block", blockSize: "11rem", borderRadius: "var(--radius-lg)" } }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-band", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "skeleton", style: { blockSize: "14rem", borderRadius: "var(--radius-lg)" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "skeleton", style: { blockSize: "14rem", borderRadius: "var(--radius-lg)" } })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-band", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "skeleton", style: { blockSize: "10rem", borderRadius: "var(--radius-lg)" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "skeleton", style: { blockSize: "10rem", borderRadius: "var(--radius-lg)" } })
      ] })
    ] });
  }
  if (error || !base) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "error-state", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "error-state__icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AlertCircleIcon, { className: "icon--lg" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "error-state__title", children: ar.dashboard.loadFailed }),
      error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "error-state__hint", children: error }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", className: "btn btn--soft btn--sm", style: { marginBlockStart: "var(--space-3)" }, onClick: () => void loadBase(), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshIcon, { className: "icon--sm" }),
        ar.dashboard.retry
      ] })
    ] });
  }
  const netCash = shiftState?.cash ? shiftState.cash.cashSales + shiftState.cash.cashIn - shiftState.cash.cashOut : 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stack", children: [
    base.warehouses.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "dash-filter-bar", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "dash-filter", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-filter__label", children: ar.dashboard.warehouseFilter }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "select",
        {
          className: "field field--sm",
          value: warehouseId ?? "",
          onChange: (e) => setWarehouseId(Number(e.target.value)),
          children: base.warehouses.map((w2) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: w2.id, children: w2.nameAr }, w2.id))
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-hero", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-card dash-card--success", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-card__icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUpIcon, {}) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-card__body", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-card__label", children: ar.dashboard.todaySales }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-card__value", dir: "ltr", children: fromPiastres(base.todaySalesTotal) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "dash-card__sub", children: [
            ar.dashboard.todayProfit,
            ": ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { dir: "ltr", children: fromPiastres(base.todayProfit) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-card__icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ReceiptIcon, {}) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-card__body", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-card__label", children: ar.dashboard.todayInvoices }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-card__value", dir: "ltr", children: base.todayInvoiceCount })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: shiftState?.shiftOpen ? "dash-card dash-card--success" : "dash-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-card__icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx(WalletIcon, {}) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-card__body", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-card__label", children: ar.dashboard.openShift }),
          shiftLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "skeleton", style: { inlineSize: "5rem", blockSize: "1.4rem", display: "inline-block" } }) : shiftState?.shiftOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-card__value", dir: "ltr", children: fromPiastres(shiftState.expectedCash ?? 0) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-card__sub", children: ar.dashboard.noOpenShift })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-panel-header", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "section-heading section-heading--inline", children: ar.dashboard.salesTrend }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-chart-tabs", children: TREND_PRESETS.map((n2) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: n2 === activeTrendPreset ? "dash-chart-tab dash-chart-tab--active" : "dash-chart-tab",
            onClick: () => applyTrendPreset(n2),
            children: ar.dashboard.lastNDays.replace("{n}", String(n2))
          },
          n2
        )) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-trend-range", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "dash-trend-range__field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-trend-range__label", children: ar.salesReport.fromDate }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "field field--sm field--date",
              type: "date",
              dir: "ltr",
              value: trendFrom,
              max: trendTo,
              onChange: (e) => setTrendFrom(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "dash-trend-range__field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-trend-range__label", children: ar.salesReport.toDate }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "field field--sm field--date",
              type: "date",
              dir: "ltr",
              value: trendTo,
              min: trendFrom,
              max: todayIso$2(),
              onChange: (e) => setTrendTo(e.target.value)
            }
          )
        ] })
      ] }),
      trendRangeInvalid ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: ar.salesReport.errors.invalidRange }) : trendLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "skeleton", style: { display: "block", blockSize: "9rem", borderRadius: "var(--radius-md)" } }) : trendError ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "dash-chart-empty", children: ar.dashboard.salesTrendFailed }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
        SalesSparkline,
        {
          points: trend.map((p2) => ({
            label: p2.label,
            value: p2.total,
            displayValue: fromPiastres(p2.total)
          }))
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "section-heading section-heading--inline", children: ar.dashboard.operationsSection }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-band", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-panel-header", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "section-heading section-heading--inline", children: ar.dashboard.lowStockList }),
          base.lowStockSample.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", className: "btn btn--ghost btn--sm", onClick: () => onNavigate("items.stock"), children: [
            ar.dashboard.viewAll,
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeftIcon, { className: "icon--sm" })
          ] })
        ] }),
        base.lowStockSample.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { title: ar.dashboard.noLowStock }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: base.lowStockSample.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-tx-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-tx-icon dash-tx-icon--warning", children: /* @__PURE__ */ jsxRuntimeExports.jsx(BoxIcon, { className: "icon--sm" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-tx-main", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-tx-title", children: item.nameAr }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-tx-amount", dir: "ltr", children: item.qtyOnHand === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge badge--error", children: ar.stock.outOfStock }) : item.qtyOnHand })
        ] }, item.itemId)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-panel-header", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "section-heading section-heading--inline", children: ar.dashboard.recentTransactions }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", className: "btn btn--ghost btn--sm", onClick: () => onNavigate("sales.invoices"), children: [
            ar.dashboard.viewAll,
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeftIcon, { className: "icon--sm" })
          ] })
        ] }),
        base.recentInvoices.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { title: ar.dashboard.noTransactions }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: base.recentInvoices.map((inv) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-tx-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-tx-icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ReceiptIcon, { className: "icon--sm" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "dash-tx-main", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "dash-tx-title", children: [
              ar.salesReport.serial,
              " #",
              inv.serial,
              " · ",
              inv.invoiceType === "cash" ? ar.sales.cash : ar.sales.credit
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-tx-meta", children: relativeTime(inv.confirmedAt ?? inv.createdAt) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-tx-amount", dir: "ltr", children: fromPiastres(inv.total) })
        ] }, inv.id)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "section-heading section-heading--inline", children: ar.dashboard.financialSection }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-band", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "section-heading", children: ar.dashboard.cashSnapshot }),
        shiftLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "skeleton", style: { display: "block", blockSize: "8rem", borderRadius: "var(--radius-md)" } }) : !shiftState?.cash ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { title: ar.dashboard.noOpenShift }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-cash-rows", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-cash-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-cash-row__label", children: ar.dashboard.cashSalesLabel }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-cash-row__value", dir: "ltr", children: fromPiastres(shiftState.cash.cashSales) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-cash-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-cash-row__label", children: ar.dashboard.cashInLabel }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-cash-row__value", dir: "ltr", children: fromPiastres(shiftState.cash.cashIn) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-cash-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-cash-row__label", children: ar.dashboard.cashOutLabel }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-cash-row__value", dir: "ltr", children: fromPiastres(shiftState.cash.cashOut) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-cash-row dash-cash-row--net", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-cash-row__label", children: ar.dashboard.netCashLabel }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-cash-row__value", dir: "ltr", children: fromPiastres(netCash) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "section-heading", children: ar.dashboard.receivables }),
        !base.receivables || base.receivables.totalOwed === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { title: ar.dashboard.noReceivables }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dash-stat-block", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-stat-block__value dash-stat-block__value--warning", dir: "ltr", children: fromPiastres(base.receivables.totalOwed) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "dash-stat-block__hint", children: [
            base.receivables.customerCount,
            " ",
            ar.dashboard.receivablesHint
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--soft btn--sm dash-stat-block__action", onClick: () => onNavigate("customers.list"), children: ar.dashboard.viewAll })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "section-heading", children: ar.dashboard.quickLinks }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "dash-quick-links", children: QUICK_LINKS.map((link) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", className: "dash-quick-link", onClick: () => onNavigate(link.target), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dash-quick-link__icon", children: link.icon }),
        link.label
      ] }, link.target)) })
    ] })
  ] });
}
function MoneyInput({ value, onChange, id: id2, placeholder, disabled }) {
  const [text, setText] = reactExports.useState(() => value === null ? "" : fromPiastres(value));
  const [invalid, setInvalid] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const current = text.trim() === "" ? null : safeParse(text);
    if (current !== value) {
      setText(value === null ? "" : fromPiastres(value));
      setInvalid(false);
    }
  }, [value]);
  function safeParse(raw) {
    try {
      return toPiastres(raw);
    } catch {
      return null;
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "input",
    {
      id: id2,
      type: "text",
      inputMode: "decimal",
      dir: "ltr",
      className: invalid ? "field field--invalid" : "field",
      value: text,
      placeholder,
      disabled,
      onChange: (e) => {
        const raw = e.target.value;
        setText(raw);
        if (raw.trim() === "") {
          setInvalid(false);
          onChange(null);
          return;
        }
        const parsed = safeParse(raw);
        setInvalid(parsed === null);
        if (parsed !== null) onChange(parsed);
      },
      onBlur: () => {
        if (value !== null) {
          setText(fromPiastres(value));
          setInvalid(false);
        }
      }
    }
  );
}
function formatShortcut(s) {
  const parts = [];
  parts.push("Ctrl");
  parts.push("Shift");
  if (s.alt) parts.push("Alt");
  let key = s.code;
  if (key.startsWith("Key")) key = key.slice(3);
  else if (key.startsWith("Digit")) key = key.slice(5);
  else if (key.startsWith("F") && /^F\d+$/.test(key)) ;
  parts.push(key);
  return parts.join("+");
}
function matches(e, s) {
  return e.code === s.code && e.ctrlKey === Boolean(s.ctrl) && e.shiftKey === Boolean(s.shift) && e.altKey === Boolean(s.alt);
}
function attachShortcuts(bindings) {
  const handler = (e) => {
    if (e.isComposing) return;
    for (const binding of bindings) {
      if (matches(e, binding)) {
        e.preventDefault();
        e.stopPropagation();
        binding.run();
        return;
      }
    }
  };
  document.addEventListener("keydown", handler, true);
  return () => document.removeEventListener("keydown", handler, true);
}
const DEFAULT_SCANNER_CONFIG = {
  prefixCode: null,
  terminator: "Enter",
  maxIntervalMs: 35,
  minLength: 4,
  maxLength: 32,
  debounceMs: 300,
  captureTimeoutMs: 600,
  idleFlushMs: 120
};
const CODE_TO_CHAR = {};
for (let i = 0; i <= 9; i++) {
  CODE_TO_CHAR[`Digit${i}`] = String(i);
  CODE_TO_CHAR[`Numpad${i}`] = String(i);
}
for (let i = 0; i < 26; i++) {
  CODE_TO_CHAR[`Key${String.fromCharCode(65 + i)}`] = String.fromCharCode(97 + i);
}
Object.assign(CODE_TO_CHAR, {
  Minus: "-",
  Equal: "=",
  Period: ".",
  Slash: "/",
  Backslash: "\\",
  Space: " ",
  NumpadSubtract: "-",
  NumpadDecimal: ".",
  NumpadDivide: "/",
  NumpadMultiply: "*",
  NumpadAdd: "+"
});
function charFromEvent(e) {
  const base = CODE_TO_CHAR[e.code];
  if (base === void 0) return null;
  if (e.shiftKey && e.code.startsWith("Digit")) return null;
  if (e.shiftKey && e.code.startsWith("Key")) return base.toUpperCase();
  return base;
}
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F]/;
const ARABIC_TO_LATIN = {
  "ض": "q",
  "ص": "w",
  "ث": "e",
  "ق": "r",
  "ف": "t",
  "غ": "y",
  "ع": "u",
  "ه": "i",
  "خ": "o",
  "ح": "p",
  "ج": "[",
  "د": "]",
  "ش": "a",
  "س": "s",
  "ي": "d",
  "ب": "f",
  "ل": "g",
  "ا": "h",
  "ت": "j",
  "ن": "k",
  "م": "l",
  "ك": ";",
  "ط": "'",
  "ئ": "z",
  "ء": "x",
  "ؤ": "c",
  "ر": "v",
  "ى": "n",
  "ة": "m",
  "و": ",",
  "ز": ".",
  "ظ": "/",
  // Arabic-Indic digits, which some layouts emit for the number row.
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9"
};
function hasArabic(s) {
  return ARABIC_RE.test(s);
}
function repairArabic(s) {
  let out = "";
  for (const ch2 of s) {
    if (!ARABIC_RE.test(ch2)) {
      out += ch2;
      continue;
    }
    const latin = ARABIC_TO_LATIN[ch2];
    if (latin === void 0) return null;
    out += latin.toUpperCase();
  }
  return out;
}
function stripLeaked(text) {
  const el2 = document.activeElement;
  if (!el2) return;
  if (el2.tagName !== "INPUT" && el2.tagName !== "TEXTAREA") return;
  if (typeof el2.value !== "string") return;
  if (el2.readOnly || el2.disabled) return;
  const lower = el2.value.toLowerCase();
  if (!lower.endsWith(text.toLowerCase())) return;
  const next = el2.value.slice(0, el2.value.length - text.length);
  const proto = el2.tagName === "INPUT" ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el2, next);
  else el2.value = next;
  el2.dispatchEvent(new Event("input", { bubbles: true }));
}
const emptyRejections = () => ({
  too_short: 0,
  too_long: 0,
  too_slow: 0,
  debounced: 0,
  arabic_unrecoverable: 0
});
function createScanner(onScan, options = {}) {
  const cfg = { ...DEFAULT_SCANNER_CONFIG, ...options.config };
  if (cfg.minLength < 3) {
    console.warn("[scanner] minLength below 3 will misread ordinary typing as scans.");
  }
  let buffer = "";
  let startedAt = 0;
  let lastKeyAt = 0;
  let inPrefixCapture = false;
  let watchdog = null;
  let idleTimer = null;
  let lastCode = "";
  let lastCodeAt = 0;
  const intervals = [];
  const diag = {
    totalScans: 0,
    prefixScans: 0,
    timingScans: 0,
    rejections: emptyRejections(),
    arabicContamination: 0,
    watchdogResets: 0,
    medianIntervalMs: null,
    lastScanAt: null,
    mode: cfg.prefixCode ? "prefix" : "timing",
    warnings: []
  };
  let pending = null;
  const clearTimers = () => {
    if (watchdog) {
      clearTimeout(watchdog);
      watchdog = null;
    }
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  };
  const reset = () => {
    clearTimers();
    buffer = "";
    startedAt = 0;
    lastKeyAt = 0;
    inPrefixCapture = false;
  };
  const reject = (reason) => {
    diag.rejections[reason] += 1;
    options.onReject?.(reason, buffer);
    reset();
  };
  const recordInterval = (gap) => {
    if (gap <= 0) return;
    intervals.push(gap);
    if (intervals.length > 60) intervals.shift();
    const sorted = [...intervals].sort((a, b) => a - b);
    diag.medianIntervalMs = sorted[Math.floor(sorted.length / 2)] ?? null;
  };
  const emit = (source, now) => {
    const raw = buffer;
    const duration = now - startedAt;
    reset();
    if (raw.length < cfg.minLength) return reject("too_short");
    if (raw.length > cfg.maxLength) return reject("too_long");
    let code = raw;
    let repaired = false;
    if (hasArabic(raw)) {
      diag.arabicContamination += 1;
      const fixed = repairArabic(raw);
      if (fixed === null) {
        options.onGuard?.(
          "arabic",
          `Unmappable Arabic in scan "${raw}". A keyboard-layout-dependent read (event.key) is leaking in. Fix the source; do not rely on repair.`
        );
        return reject("arabic_unrecoverable");
      }
      code = fixed;
      repaired = true;
      options.onGuard?.(
        "arabic",
        `Repaired Arabic-contaminated scan "${raw}" → "${code}". Something bypassed the event.code map — investigate rather than shipping on the repair path.`
      );
    }
    if (code === lastCode && now - lastCodeAt < cfg.debounceMs) {
      diag.rejections.debounced += 1;
      return;
    }
    lastCode = code;
    lastCodeAt = now;
    diag.totalScans += 1;
    diag.lastScanAt = Date.now();
    if (source === "prefix") diag.prefixScans += 1;
    else diag.timingScans += 1;
    if (source === "timing" && diag.medianIntervalMs !== null && diag.medianIntervalMs > cfg.maxIntervalMs * 0.7 && !diag.warnings.length) {
      diag.warnings.push(
        "Scan intervals are close to the detection threshold. Program the scanner with a prefix key and switch to prefix mode."
      );
    }
    const event = { code, source, durationMs: duration, at: now, repaired };
    onScan(event);
    if (pending) {
      const resolve = pending;
      pending = null;
      resolve(buildSelfTest(event));
    }
  };
  const buildSelfTest = (event) => {
    const problems = [];
    if (event.repaired) problems.push("Arabic contamination detected and repaired.");
    if (diag.watchdogResets > 0) problems.push("Terminator missing — watchdog fired.");
    if (event.source === "timing") problems.push("Running on the timing heuristic.");
    if (diag.medianIntervalMs !== null && diag.medianIntervalMs > cfg.maxIntervalMs) {
      problems.push(`Median interval ${diag.medianIntervalMs}ms exceeds the ${cfg.maxIntervalMs}ms threshold.`);
    }
    return {
      ok: problems.length === 0,
      code: event.code,
      source: event.source,
      medianIntervalMs: diag.medianIntervalMs,
      repaired: event.repaired,
      problems,
      recommendation: problems.length ? "Program the scanner with an F9 prefix and set terminator to Enter." : "Scanner configured correctly."
    };
  };
  const handler = (e) => {
    if (e.isComposing || e.keyCode === 229) return reset();
    if (e.repeat) return;
    if (options.shouldIgnore?.()) return reset();
    if (e.ctrlKey || e.altKey || e.metaKey) return reset();
    const now = performance.now();
    if (cfg.prefixCode) {
      if (e.code === cfg.prefixCode) {
        e.preventDefault();
        e.stopPropagation();
        clearTimers();
        buffer = "";
        startedAt = now;
        lastKeyAt = now;
        inPrefixCapture = true;
        watchdog = setTimeout(() => {
          diag.watchdogResets += 1;
          const stuck = buffer;
          reset();
          options.onGuard?.(
            "watchdog",
            `No terminator after ${cfg.captureTimeoutMs}ms (buffer "${stuck}"). Keyboard released. Configure the scanner suffix to ${cfg.terminator}.`
          );
        }, cfg.captureTimeoutMs);
        return;
      }
      if (!inPrefixCapture) return;
      if (e.code === "Escape") {
        reset();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "Enter" || e.code === "Tab" || e.code === cfg.terminator) {
        emit("prefix", now);
        return;
      }
      const ch22 = charFromEvent(e);
      if (ch22 !== null) {
        buffer += ch22;
        recordInterval(now - lastKeyAt);
      }
      lastKeyAt = now;
      if (buffer.length > cfg.maxLength) {
        options.onGuard?.("watchdog", `Buffer exceeded ${cfg.maxLength} chars. Discarded.`);
        reject("too_long");
      }
      return;
    }
    const gap = lastKeyAt === 0 ? 0 : now - lastKeyAt;
    if (e.code === "Enter" || e.code === "Tab") {
      const fast = gap <= cfg.maxIntervalMs;
      const longEnough = buffer.length >= cfg.minLength;
      if (fast && longEnough) {
        e.preventDefault();
        e.stopPropagation();
        const leaked = buffer;
        emit("timing", now);
        stripLeaked(leaked);
      } else {
        if (buffer.length && !fast) diag.rejections.too_slow += 1;
        reset();
      }
      return;
    }
    const ch2 = charFromEvent(e);
    if (ch2 === null) return reset();
    if (gap > cfg.maxIntervalMs) {
      buffer = ch2;
      startedAt = now;
    } else {
      buffer += ch2;
      recordInterval(gap);
      if (startedAt === 0) startedAt = now;
    }
    lastKeyAt = now;
    if (buffer.length > cfg.maxLength) return reject("too_long");
    if (cfg.terminator === "None") {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (buffer.length >= cfg.minLength) {
          const leaked = buffer;
          emit("timing", performance.now());
          stripLeaked(leaked);
        } else {
          reset();
        }
      }, cfg.idleFlushMs);
    }
  };
  document.addEventListener("keydown", handler, true);
  return {
    detach: () => {
      clearTimers();
      document.removeEventListener("keydown", handler, true);
    },
    diagnostics: () => ({ ...diag, rejections: { ...diag.rejections } }),
    selfTest: (timeoutMs = 15e3) => new Promise((resolve) => {
      pending = resolve;
      setTimeout(() => {
        if (!pending) return;
        pending = null;
        resolve({
          ok: false,
          problems: ["No scan received."],
          recommendation: "Check the USB connection, then verify the scanner is in HID keyboard mode."
        });
      }, timeoutMs);
    })
  };
}
function useBarcodeScanner(onScan, options = {}) {
  const { enabled = true, config, shouldIgnore, onReject, onGuard } = options;
  const scanRef = reactExports.useRef(onScan);
  scanRef.current = onScan;
  const ignoreRef = reactExports.useRef(shouldIgnore);
  ignoreRef.current = shouldIgnore;
  const rejectRef = reactExports.useRef(onReject);
  rejectRef.current = onReject;
  const guardRef = reactExports.useRef(onGuard);
  guardRef.current = onGuard;
  reactExports.useEffect(() => {
    if (!enabled) return;
    const handle = createScanner((e) => scanRef.current(e), {
      config,
      shouldIgnore: () => ignoreRef.current?.() ?? false,
      onReject: (r2, b) => rejectRef.current?.(r2, b),
      onGuard: (g, d) => guardRef.current?.(g, d)
    });
    return handle.detach;
  }, [enabled, JSON.stringify(config ?? {})]);
}
function isValidEan(code) {
  if (!/^\d{8}$|^\d{13}$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop();
  const weights = code.length === 13 ? [1, 3] : [3, 1];
  const sum = digits.reduce((acc, d, i) => acc + d * (weights[i % 2] ?? 1), 0);
  return (10 - sum % 10) % 10 === check;
}
function classifyBarcode(code) {
  if (/^\d{13}$/.test(code)) return "ean13";
  if (/^\d{8}$/.test(code)) return "ean8";
  if (/^\d{1,7}$/.test(code)) return "internal";
  return "code128";
}
const STORAGE_KEY = "hardware.scanner";
const INSTALLED_SCANNER_CONFIG = {
  ...DEFAULT_SCANNER_CONFIG,
  prefixCode: null,
  terminator: "Enter",
  maxIntervalMs: 35,
  minLength: 4,
  debounceMs: 300
};
function loadScannerConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INSTALLED_SCANNER_CONFIG;
    return { ...INSTALLED_SCANNER_CONFIG, ...JSON.parse(raw) };
  } catch {
    return INSTALLED_SCANNER_CONFIG;
  }
}
function saveScannerConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
  }
}
const SAVE = { code: "KeyS", ctrl: true, shift: true };
function ItemForm({ existing, showBadges, onSaved, onCancel }) {
  const [tab, setTab] = reactExports.useState("basic");
  const [saving, setSaving] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [nameAr, setNameAr] = reactExports.useState(existing?.nameAr ?? "");
  const [nameEn, setNameEn] = reactExports.useState(existing?.nameEn ?? "");
  const [internationalCode, setInternationalCode] = reactExports.useState("");
  const [origin, setOrigin] = reactExports.useState("local");
  const [itemNature, setItemNature] = reactExports.useState("");
  const [scientificName, setScientificName] = reactExports.useState("");
  const [mainIngredientPct, setMainIngredientPct] = reactExports.useState("");
  const [noExpiry, setNoExpiry] = reactExports.useState(Boolean(existing?.noExpiry));
  const [requiresPrescription, setRequiresPrescription] = reactExports.useState(false);
  const [scheduleClass, setScheduleClass] = reactExports.useState(existing?.scheduleClass ?? "none");
  const [storageCondition, setStorageCondition] = reactExports.useState(
    existing?.storageCondition ?? "room"
  );
  const [shelfLocation, setShelfLocation] = reactExports.useState(existing?.shelfLocation ?? "");
  const [publicPrice, setPublicPrice] = reactExports.useState(existing?.publicPrice ?? null);
  const [minStock, setMinStock] = reactExports.useState("0");
  const [maxStock, setMaxStock] = reactExports.useState("");
  const [barcodes, setBarcodes] = reactExports.useState(
    existing?.barcodes?.length ? existing.barcodes : [""]
  );
  const [units, setUnits] = reactExports.useState(
    () => existing?.units?.length ? existing.units.map((u2) => ({
      id: u2.id,
      nameAr: u2.nameAr,
      factor: String(u2.factor),
      salePrice: u2.salePrice,
      isBase: Boolean(u2.isBase),
      isDefaultSale: Boolean(u2.isDefaultSale)
    })) : [{ nameAr: "", factor: "1", salePrice: null, isBase: true, isDefaultSale: true }]
  );
  const firstFieldRef = reactExports.useRef(null);
  reactExports.useEffect(() => firstFieldRef.current?.focus(), []);
  const [scanNotice, setScanNotice] = reactExports.useState(null);
  const barcodesRef = reactExports.useRef(barcodes);
  barcodesRef.current = barcodes;
  useBarcodeScanner(
    (event) => {
      const code = event.code;
      const current = barcodesRef.current;
      if (current.some((b) => b.trim() === code)) {
        setScanNotice(ar.items.scan.duplicate.replace("{code}", code));
        return;
      }
      const emptyIndex = current.findIndex((b) => b.trim() === "");
      const next = emptyIndex >= 0 ? current.map((b, i) => i === emptyIndex ? code : b) : [...current, code];
      setBarcodes(next);
      setTab("basic");
      const kind = classifyBarcode(code);
      if ((kind === "ean13" || kind === "ean8") && !isValidEan(code)) {
        setScanNotice(ar.items.scan.badCheckDigit.replace("{code}", code));
      } else {
        setScanNotice(ar.items.scan.added.replace("{code}", code));
      }
    },
    {
      config: loadScannerConfig(),
      // Timing mode cannot tell a scan from fast typing in a text field, and a
      // barcode landing in the drug-name field is worse than a missed scan.
      // Suppress while a non-barcode text input holds focus.
      shouldIgnore: () => {
        const el2 = document.activeElement;
        if (!el2) return false;
        if (el2.dataset?.scanTarget === "barcode") return false;
        const tag = el2.tagName;
        return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      },
      onGuard: (guard, detail) => {
        console.warn(`[scanner:${guard}] ${detail}`);
      }
    }
  );
  const submitRef = reactExports.useRef(() => {
  });
  const cancelRef = reactExports.useRef(onCancel);
  cancelRef.current = onCancel;
  reactExports.useEffect(
    () => attachShortcuts([
      { id: "save", ...SAVE, run: () => submitRef.current() },
      { id: "cancel", code: "Escape", run: () => cancelRef.current() }
    ]),
    []
  );
  function buildInput() {
    const cleanBarcodes = barcodes.map((b) => b.trim()).filter(Boolean);
    const cleanUnits = units.filter((u2) => u2.nameAr.trim() !== "").map((u2) => ({
      id: u2.id,
      nameAr: u2.nameAr.trim(),
      factor: Number(u2.factor),
      salePrice: u2.salePrice ?? 0,
      isBase: u2.isBase,
      isDefaultSale: u2.isDefaultSale
    }));
    return {
      nameAr: nameAr.trim(),
      nameEn: nameEn.trim() || null,
      internationalCode: internationalCode.trim() || null,
      origin,
      itemNature: itemNature.trim() || null,
      scientificName: scientificName.trim() || null,
      mainIngredientPct: mainIngredientPct === "" ? null : Number(mainIngredientPct),
      scheduleClass,
      storageCondition,
      noExpiry,
      requiresPrescription,
      shelfLocation: shelfLocation.trim() || null,
      publicPrice,
      minStock: minStock === "" ? 0 : Number(minStock),
      maxStock: maxStock === "" ? null : Number(maxStock),
      barcodes: cleanBarcodes,
      units: cleanUnits
    };
  }
  function validate(input) {
    if (!input.nameAr) return ar.items.errors.nameRequired;
    if (input.mainIngredientPct != null && (!Number.isFinite(input.mainIngredientPct) || input.mainIngredientPct < 0 || input.mainIngredientPct > 100)) {
      return ar.items.errors.mainIngredientPctInvalid;
    }
    if (input.maxStock != null && input.maxStock < (input.minStock ?? 0)) {
      return ar.items.errors.maxStockBelowMin;
    }
    if (input.barcodes && input.barcodes.length > 0) {
      const seen = /* @__PURE__ */ new Set();
      for (const b of input.barcodes) {
        if (seen.has(b)) return ar.items.errors.duplicateBarcodeInForm;
        seen.add(b);
      }
    }
    if (input.units && input.units.length > 0) {
      const unitErrors = validateUnitSet(
        input.units.map((u2, i) => ({
          id: i,
          nameAr: u2.nameAr,
          factor: u2.factor,
          isBase: u2.isBase
        }))
      );
      if (unitErrors.length > 0) return describeUnitError(unitErrors[0]);
      if (input.publicPrice != null) {
        for (const u2 of input.units) {
          const perBase = u2.salePrice / u2.factor;
          if (perBase > input.publicPrice) return ar.items.errors.priceAbovePublic;
        }
      }
    }
    return null;
  }
  function describeUnitError(message) {
    if (message.startsWith("Duplicate unit name")) {
      const name = message.match(/"([^"]*)"/)?.[1] ?? "";
      return ar.items.errors.duplicateUnitName.replace("{name}", name);
    }
    if (message.includes("invalid factor")) {
      const name = message.match(/"([^"]*)"/)?.[1] ?? "";
      return ar.items.errors.invalidUnitFactor.replace("{name}", name);
    }
    if (/base units defined/.test(message)) {
      return ar.items.errors.multipleBaseUnits;
    }
    return ar.items.errors.needBaseUnit;
  }
  async function submit() {
    if (saving) return;
    setError(null);
    const input = buildInput();
    const problem = validate(input);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    try {
      if (!window.api) throw new Error(ar.status.noBridge);
      if (existing) await window.api.items.update(existing.id, input);
      else await window.api.items.create(input);
      onSaved();
    } catch (err) {
      const message = err.message;
      setError(
        /UNIQUE constraint failed: item_barcodes/.test(message) ? ar.items.errors.duplicateBarcode : `${ar.items.errors.saveFailed}: ${message}`
      );
    } finally {
      setSaving(false);
    }
  }
  submitRef.current = submit;
  const tabs = [
    { id: "basic", label: ar.items.tabs.basic },
    { id: "pricing", label: ar.items.tabs.pricing },
    { id: "supplier", label: ar.items.tabs.supplier },
    { id: "settings", label: ar.items.tabs.settings }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "form",
    {
      className: "item-form",
      onSubmit: (e) => {
        e.preventDefault();
        void submit();
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "item-form__toolbar", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "submit", className: "btn btn--primary", disabled: saving, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: ar.items.actions.save }),
            showBadges && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "btn__badge", dir: "ltr", children: formatShortcut(SAVE) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", className: "btn", onClick: onCancel, disabled: saving, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: ar.items.actions.cancel }),
            showBadges && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "btn__badge btn__badge--muted", dir: "ltr", children: "Esc" })
          ] }),
          existing && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "item-form__code", dir: "ltr", children: [
            ar.items.fields.code,
            ": ",
            existing.code
          ] })
        ] }),
        error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
        scanNotice && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "alert alert--info", role: "status", children: [
          scanNotice,
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "alert__close",
              onClick: () => setScanNotice(null),
              "aria-label": ar.items.actions.cancel,
              children: "×"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tabs", role: "tablist", children: tabs.map((t2) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            role: "tab",
            "aria-selected": tab === t2.id,
            className: tab === t2.id ? "tab tab--active" : "tab",
            onClick: () => setTab(t2.id),
            children: t2.label
          },
          t2.id
        )) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel", children: [
          tab === "basic" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: ar.items.fields.nameAr, required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  ref: firstFieldRef,
                  className: "field",
                  value: nameAr,
                  onChange: (e) => setNameAr(e.target.value)
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: ar.items.fields.nameEn, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  className: "field",
                  dir: "ltr",
                  value: nameEn,
                  onChange: (e) => setNameEn(e.target.value)
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: ar.items.fields.internationalCode, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  className: "field",
                  dir: "ltr",
                  value: internationalCode,
                  onChange: (e) => setInternationalCode(e.target.value)
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: ar.items.fields.origin, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  className: "field",
                  value: origin,
                  onChange: (e) => setOrigin(e.target.value),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "local", children: ar.items.fields.originLocal }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "imported", children: ar.items.fields.originImported })
                  ]
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: ar.items.fields.itemNature, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  className: "field",
                  value: itemNature,
                  onChange: (e) => setItemNature(e.target.value)
                }
              ) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "fieldset", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { children: ar.items.fields.scientificData }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: ar.items.fields.scientificName, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "field",
                    dir: "ltr",
                    value: scientificName,
                    onChange: (e) => setScientificName(e.target.value)
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: ar.items.fields.mainIngredientPct, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "field",
                    dir: "ltr",
                    inputMode: "decimal",
                    value: mainIngredientPct,
                    onChange: (e) => setMainIngredientPct(toAsciiDigits(e.target.value))
                  }
                ) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "check", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "checkbox",
                    checked: noExpiry,
                    onChange: (e) => setNoExpiry(e.target.checked)
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: ar.items.fields.noExpiry })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              RepeatingList,
              {
                legend: ar.items.fields.barcodes,
                hint: ar.items.scan.hint,
                rows: barcodes,
                onAdd: () => setBarcodes([...barcodes, ""]),
                onRemove: (i) => setBarcodes(barcodes.filter((_, idx) => idx !== i)),
                render: (value, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "field",
                    dir: "ltr",
                    "data-scan-target": "barcode",
                    value,
                    placeholder: ar.items.fields.barcode,
                    onChange: (e) => {
                      const next = [...barcodes];
                      next[i] = e.target.value;
                      setBarcodes(next);
                    }
                  }
                )
              }
            )
          ] }),
          tab === "pricing" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: ar.items.fields.publicPrice, children: /* @__PURE__ */ jsxRuntimeExports.jsx(MoneyInput, { value: publicPrice, onChange: setPublicPrice }) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "fieldset", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { children: ar.items.fields.units }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "subtable", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.items.fields.unitName }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.items.fields.unitFactor }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.items.fields.unitPrice }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.items.fields.unitIsBase }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.items.fields.unitDefaultSale }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: units.map((u2, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      className: "field",
                      value: u2.nameAr,
                      onChange: (e) => patchUnit(i, { nameAr: e.target.value })
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      className: "field",
                      dir: "ltr",
                      inputMode: "numeric",
                      value: u2.factor,
                      onChange: (e) => patchUnit(i, { factor: toAsciiDigits(e.target.value) })
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    MoneyInput,
                    {
                      value: u2.salePrice,
                      onChange: (v2) => patchUnit(i, { salePrice: v2 })
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "radio",
                      name: "baseUnit",
                      checked: u2.isBase,
                      onChange: () => setUnits(units.map((x2, idx) => ({ ...x2, isBase: idx === i })))
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "radio",
                      name: "defaultSale",
                      checked: u2.isDefaultSale,
                      onChange: () => setUnits(
                        units.map((x2, idx) => ({ ...x2, isDefaultSale: idx === i }))
                      )
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      className: "btn btn--danger btn--sm",
                      onClick: () => setUnits(units.filter((_, idx) => idx !== i)),
                      disabled: units.length === 1,
                      children: ar.items.actions.removeRow
                    }
                  ) })
                ] }, i)) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: "btn btn--sm",
                  onClick: () => setUnits([
                    ...units,
                    {
                      nameAr: "",
                      factor: "1",
                      salePrice: null,
                      isBase: false,
                      isDefaultSale: false
                    }
                  ]),
                  children: ar.items.actions.addRow
                }
              )
            ] })
          ] }),
          tab === "supplier" && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: ar.shell.notImplementedHint }),
          tab === "settings" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: ar.items.fields.scheduleClass, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                className: "field",
                value: scheduleClass,
                onChange: (e) => setScheduleClass(e.target.value),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "none", children: ar.items.schedule.none }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "table1", children: ar.items.schedule.table1 }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "table2", children: ar.items.schedule.table2 }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "table3", children: ar.items.schedule.table3 })
                ]
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: ar.items.fields.storageCondition, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                className: "field",
                value: storageCondition,
                onChange: (e) => setStorageCondition(e.target.value),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "room", children: ar.items.storage.room }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "fridge", children: ar.items.storage.fridge }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "freezer", children: ar.items.storage.freezer })
                ]
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: ar.items.fields.shelfLocation, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "field",
                value: shelfLocation,
                onChange: (e) => setShelfLocation(e.target.value)
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: ar.items.fields.minStock, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "field",
                dir: "ltr",
                inputMode: "numeric",
                value: minStock,
                onChange: (e) => setMinStock(toAsciiDigits(e.target.value))
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: ar.items.fields.maxStock, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "field",
                dir: "ltr",
                inputMode: "numeric",
                value: maxStock,
                onChange: (e) => setMaxStock(toAsciiDigits(e.target.value))
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "span2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "check", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "checkbox",
                  checked: requiresPrescription,
                  onChange: (e) => setRequiresPrescription(e.target.checked)
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: ar.items.fields.requiresPrescription })
            ] }) })
          ] })
        ] })
      ]
    }
  );
  function patchUnit(index, patch) {
    setUnits(units.map((u2, i) => i === index ? { ...u2, ...patch } : u2));
  }
}
function Field({
  label,
  required,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "formfield__label", children: [
      label,
      required && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "req", children: " *" })
    ] }),
    children
  ] });
}
function RepeatingList({
  legend,
  hint,
  rows,
  onAdd,
  onRemove,
  render
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "fieldset", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { children: legend }),
    hint && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "hint", children: hint }),
    rows.map((row, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "repeat-row", children: [
      render(row, i),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: "btn btn--danger btn--sm",
          onClick: () => onRemove(i),
          disabled: rows.length === 1,
          children: ar.items.actions.removeRow
        }
      )
    ] }, i)),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--sm", onClick: onAdd, children: ar.items.actions.addRow })
  ] });
}
function Stat({ label, value, good, bad, neutral }) {
  const modifier = bad ? " stat--bad" : good ? " stat--good" : neutral ? " stat--neutral" : "";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `stat${modifier}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "stat__value", dir: "ltr", children: value }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "stat__label", children: label })
  ] });
}
const fill$1 = (template, vars) => Object.entries(vars).reduce((s, [k2, v2]) => s.replace(`{${k2}}`, String(v2)), template);
function ImportWizard({ onClose, onImported }) {
  const [phase, setPhase] = reactExports.useState("idle");
  const [preview, setPreview] = reactExports.useState(null);
  const [progress, setProgress] = reactExports.useState(null);
  const [summary, setSummary] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const [savedPath, setSavedPath] = reactExports.useState(null);
  const unsubscribe = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!window.api) return;
    unsubscribe.current = window.api.import.onProgress(setProgress);
    return () => unsubscribe.current?.();
  }, []);
  async function pickFile() {
    if (!window.api) return setError(ar.status.noBridge);
    setError(null);
    const path = await window.api.import.pickFile();
    if (!path) return;
    setPhase("previewing");
    try {
      setPreview(await window.api.import.preview(path));
      setPhase("ready");
    } catch (err) {
      setError(`${ar.items.import.errors.previewFailed}: ${err.message}`);
      setPhase("idle");
    }
  }
  async function remap(field, columnIndex) {
    if (!preview || !window.api) return;
    const mapping = { ...preview.mapping };
    if (columnIndex === null) delete mapping[field];
    else mapping[field] = columnIndex;
    setPhase("previewing");
    try {
      setPreview(await window.api.import.preview(preview.filePath, mapping));
    } catch (err) {
      setError(`${ar.items.import.errors.previewFailed}: ${err.message}`);
    } finally {
      setPhase("ready");
    }
  }
  async function apply() {
    if (!preview || !window.api) return;
    if (preview.acceptedCount === 0) return setError(ar.items.import.nothingToImport);
    setPhase("applying");
    setProgress({ done: 0, total: preview.acceptedCount });
    try {
      const result = await window.api.import.apply(preview.filePath, preview.mapping);
      setSummary(
        result.rejectedCount > 0 ? fill$1(ar.items.import.doneWithRejects, {
          count: result.inserted,
          rejected: result.rejectedCount
        }) : fill$1(ar.items.import.done, {
          count: result.inserted,
          seconds: (result.elapsedMs / 1e3).toFixed(1)
        })
      );
      setPhase("done");
      onImported();
    } catch (err) {
      setError(`${ar.items.import.errors.applyFailed}: ${err.message}`);
      setPhase("ready");
    }
  }
  async function exportRejects() {
    if (!preview || !window.api) return;
    try {
      const csv = rejectedToCsv(preview.rejected, preview.headers);
      const path = await window.api.import.saveRejects(csv);
      if (path) setSavedPath(path);
    } catch (err) {
      setError(`${ar.items.import.errors.exportFailed}: ${err.message}`);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "import", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "import__bar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn", onClick: onClose, children: ar.items.actions.back }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: "btn btn--primary",
          onClick: () => void pickFile(),
          disabled: phase === "applying" || phase === "previewing",
          children: ar.items.import.pickFile
        }
      )
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
    summary && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--info", children: summary }),
    savedPath && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--info", dir: "ltr", children: fill$1(ar.items.import.exported, { path: savedPath }) }),
    phase === "previewing" && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: ar.items.loading }),
    preview && phase !== "done" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted small", dir: "ltr", children: preview.filePath }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stats", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.items.import.totalRows, value: String(preview.totalRows), neutral: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.items.import.accepted, value: String(preview.acceptedCount), good: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Stat,
          {
            label: ar.items.import.rejected,
            value: String(preview.totalRows - preview.acceptedCount),
            bad: preview.totalRows - preview.acceptedCount > 0
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "fieldset", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { children: ar.items.import.mapping }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "hint", children: ar.items.import.mappingHint }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid2", children: IMPORTABLE_FIELDS.map((field) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "formfield__label", children: [
            ar.items.import.fields[field],
            REQUIRED_FIELDS.includes(field) && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "req", children: " *" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "field",
              value: preview.mapping[field] ?? "",
              onChange: (e) => void remap(field, e.target.value === "" ? null : Number(e.target.value)),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: ar.items.import.notMapped }),
                preview.headers.map((h, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: i, children: h || `#${i + 1}` }, i))
              ]
            }
          )
        ] }, field)) })
      ] }),
      preview.rejected.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "fieldset", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { children: ar.items.import.rejectedTitle }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "subtable", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.items.import.rowNumber }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.items.import.reason })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: preview.rejected.slice(0, 15).map((r2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: r2.rowNumber }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r2.reason })
          ] }, r2.rowNumber)) })
        ] }),
        preview.totalRows - preview.acceptedCount > preview.rejected.length && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "hint", children: fill$1(ar.items.import.moreRejects, { shown: preview.rejected.length }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--sm", onClick: () => void exportRejects(), children: ar.items.import.exportRejects })
      ] }),
      phase === "applying" && progress && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "progress", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "progress__fill",
            style: { inlineSize: `${Math.round(progress.done / Math.max(progress.total, 1) * 100)}%` }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "progress__label", dir: "ltr", children: fill$1(ar.items.import.progress, { done: progress.done, total: progress.total }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: "btn btn--primary",
          onClick: () => void apply(),
          disabled: phase === "applying" || preview.acceptedCount === 0,
          children: phase === "applying" ? ar.items.import.applying : ar.items.import.apply
        }
      )
    ] })
  ] });
}
function ItemsScreen({ showBadges, initialQuery }) {
  const [mode, setMode] = reactExports.useState({ view: "list" });
  const [rows, setRows] = reactExports.useState([]);
  const [total, setTotal] = reactExports.useState(0);
  const [query, setQuery] = reactExports.useState(initialQuery ?? "");
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const searchRef = reactExports.useRef(null);
  const debounce = reactExports.useRef();
  const load = reactExports.useCallback(async (q2) => {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [list, count] = await Promise.all([
        q2.trim() ? window.api.items.search(q2, 200) : window.api.items.list({ limit: 200 }),
        window.api.items.count()
      ]);
      setRows(list);
      setTotal(count);
    } catch (err) {
      setError(`${ar.items.errors.loadFailed}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);
  reactExports.useEffect(() => {
    if (mode.view === "list") void load(query);
  }, [mode.view]);
  reactExports.useEffect(() => {
    if (mode.view !== "list") return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void load(query), 120);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);
  reactExports.useEffect(() => {
    if (mode.view === "list") searchRef.current?.focus();
  }, [mode.view]);
  async function openEdit(id2) {
    if (!window.api) return;
    const item = await window.api.items.get(id2);
    if (item) setMode({ view: "edit", item });
  }
  async function deactivate(id2) {
    if (!window.api) return;
    if (!confirm(ar.items.confirmDeactivate)) return;
    try {
      await window.api.items.deactivate(id2);
      void load(query);
    } catch (err) {
      setError(`${ar.items.errors.deactivateFailed}: ${err.message}`);
    }
  }
  if (mode.view === "create" || mode.view === "edit") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      ItemForm,
      {
        existing: mode.view === "edit" ? mode.item : null,
        showBadges,
        onSaved: () => setMode({ view: "list" }),
        onCancel: () => setMode({ view: "list" })
      }
    );
  }
  if (mode.view === "import") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      ImportWizard,
      {
        onClose: () => setMode({ view: "list" }),
        onImported: () => void load(query)
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "items", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "items__bar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          ref: searchRef,
          className: "field items__search",
          placeholder: ar.items.search,
          value: query,
          onChange: (e) => setQuery(e.target.value)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: "btn btn--primary",
          onClick: () => setMode({ view: "create" }),
          children: ar.items.add
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn", onClick: () => setMode({ view: "import" }), children: ar.items.import.open }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "items__count", children: [
        ar.items.count,
        ": ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { dir: "ltr", children: total })
      ] })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableSkeleton, { cols: 5 }) : rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { title: query.trim() ? ar.items.noResults : ar.items.empty }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "datatable", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.items.fields.code }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.items.fields.nameAr }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.items.fields.nameEn }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.items.fields.publicPrice }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.items.fields.shelfLocation }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: rows.map((r2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { onDoubleClick: () => void openEdit(r2.id), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: r2.code }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r2.nameAr }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: r2.nameEn ?? "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: r2.publicPrice === null ? "—" : fromPiastres(r2.publicPrice) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r2.shelfLocation ?? "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "datatable__actions", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn--sm",
              onClick: () => void openEdit(r2.id),
              children: ar.items.edit
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn--danger btn--sm",
              onClick: () => void deactivate(r2.id),
              children: ar.items.deactivate
            }
          )
        ] })
      ] }, r2.id)) })
    ] })
  ] });
}
function WarehousesScreen() {
  const [rows, setRows] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [editing, setEditing] = reactExports.useState(null);
  const [nameAr, setNameAr] = reactExports.useState("");
  const [isDefault, setIsDefault] = reactExports.useState(false);
  async function load() {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(await window.api.warehouses.list());
    } catch (err) {
      setError(`${ar.warehouses.errors.loadFailed}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    void load();
  }, []);
  function startEdit(row) {
    setEditing(row);
    setNameAr(row === "new" ? "" : row.nameAr);
    setIsDefault(row !== "new" && Boolean(row.isDefault));
    setError(null);
  }
  async function save() {
    if (!window.api) return;
    setError(null);
    if (!nameAr.trim()) return setError(ar.warehouses.errors.nameRequired);
    try {
      if (editing === "new") {
        await window.api.warehouses.create({ nameAr: nameAr.trim(), isDefault });
      } else if (editing) {
        await window.api.warehouses.update(editing.id, { nameAr: nameAr.trim(), isDefault });
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(`${ar.warehouses.errors.saveFailed}: ${err.message}`);
    }
  }
  async function deactivate(row) {
    if (!window.api) return;
    if (!confirm(ar.warehouses.confirmDeactivate)) return;
    try {
      await window.api.warehouses.deactivate(row.id);
      await load();
    } catch (err) {
      setError(
        /Cannot deactivate the default warehouse/.test(err.message) ? ar.warehouses.cannotDeactivateDefault : `${ar.warehouses.errors.deactivateFailed}: ${err.message}`
      );
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "items", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "items__bar", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--primary", onClick: () => startEdit("new"), children: ar.warehouses.add }) }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
    editing && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel mb", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.warehouses.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", value: nameAr, onChange: (e) => setNameAr(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "check check--end", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              checked: isDefault,
              onChange: (e) => setIsDefault(e.target.checked)
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: ar.warehouses.isDefault })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "btn-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--primary", onClick: () => void save(), children: ar.items.actions.save }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn", onClick: () => setEditing(null), children: ar.items.actions.cancel })
      ] })
    ] }),
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableSkeleton, { cols: 3 }) : rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { title: ar.warehouses.empty }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "datatable", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.warehouses.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: rows.map((r2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r2.nameAr }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: Boolean(r2.isDefault) && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge", children: ar.warehouses.default }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "datatable__actions", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--sm", onClick: () => startEdit(r2), children: ar.items.edit }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn--danger btn--sm",
              onClick: () => void deactivate(r2),
              disabled: Boolean(r2.isDefault),
              children: ar.items.deactivate
            }
          )
        ] })
      ] }, r2.id)) })
    ] })
  ] });
}
function SuppliersScreen() {
  const [mode, setMode] = reactExports.useState({ view: "list" });
  const [rows, setRows] = reactExports.useState([]);
  const [query, setQuery] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const debounce = reactExports.useRef();
  async function load(q2) {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(q2.trim() ? await window.api.suppliers.search(q2, 200) : await window.api.suppliers.list());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    if (mode.view === "list") void load(query);
  }, [mode.view]);
  reactExports.useEffect(() => {
    if (mode.view !== "list") return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void load(query), 120);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);
  async function deactivate(id2) {
    if (!window.api) return;
    if (!confirm(ar.suppliers.confirmDeactivate)) return;
    await window.api.suppliers.deactivate(id2);
    void load(query);
  }
  if (mode.view === "form") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      SupplierForm,
      {
        existing: mode.existing,
        onSaved: () => setMode({ view: "list" }),
        onCancel: () => setMode({ view: "list" })
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "items", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "items__bar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "field items__search",
          placeholder: ar.suppliers.search,
          value: query,
          onChange: (e) => setQuery(e.target.value)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: "btn btn--primary",
          onClick: () => setMode({ view: "form", existing: null }),
          children: ar.suppliers.add
        }
      )
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableSkeleton, { cols: 5 }) : rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { title: query.trim() ? ar.suppliers.noResults : ar.suppliers.empty }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "datatable", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.suppliers.code }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.suppliers.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.suppliers.phone1 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.suppliers.openingBalance }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: rows.map((r2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: r2.code }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r2.nameAr }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: r2.phone1 ?? "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: fromPiastres(r2.openingBalance) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "datatable__actions", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn--sm",
              onClick: () => setMode({ view: "form", existing: r2 }),
              children: ar.suppliers.edit
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn--danger btn--sm",
              onClick: () => void deactivate(r2.id),
              children: ar.items.deactivate
            }
          )
        ] })
      ] }, r2.id)) })
    ] })
  ] });
}
function SupplierForm({
  existing,
  onSaved,
  onCancel
}) {
  const [nameAr, setNameAr] = reactExports.useState(existing?.nameAr ?? "");
  const [phone1, setPhone1] = reactExports.useState(existing?.phone1 ?? "");
  const [phone2, setPhone2] = reactExports.useState(existing?.phone2 ?? "");
  const [address, setAddress] = reactExports.useState(existing?.address ?? "");
  const [taxNumber, setTaxNumber] = reactExports.useState(existing?.taxNumber ?? "");
  const [openingBalance, setOpeningBalance] = reactExports.useState(
    existing?.openingBalance ?? null
  );
  const [paymentTermsDays, setPaymentTermsDays] = reactExports.useState(
    existing?.paymentTermsDays != null ? String(existing.paymentTermsDays) : ""
  );
  const [error, setError] = reactExports.useState(null);
  async function submit() {
    setError(null);
    if (!nameAr.trim()) return setError(ar.suppliers.errors.nameRequired);
    const termsDays = paymentTermsDays === "" ? null : Number(paymentTermsDays);
    if (termsDays !== null && termsDays < 0) return setError(ar.suppliers.errors.negativePaymentTerms);
    if (!window.api) return setError(ar.status.noBridge);
    const input = {
      nameAr: nameAr.trim(),
      phone1: toAsciiDigits(phone1.trim()) || null,
      phone2: toAsciiDigits(phone2.trim()) || null,
      address: address.trim() || null,
      taxNumber: taxNumber.trim() || null,
      openingBalance: openingBalance ?? 0,
      paymentTermsDays: termsDays
    };
    try {
      if (existing) await window.api.suppliers.update(existing.id, input);
      else await window.api.suppliers.create(input);
      onSaved();
    } catch (err) {
      setError(`${ar.suppliers.errors.saveFailed}: ${err.message}`);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "item-form", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "item-form__toolbar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--primary", onClick: () => void submit(), children: ar.items.actions.save }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn", onClick: onCancel, children: ar.items.actions.cancel })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "panel", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "formfield__label", children: [
          ar.suppliers.name,
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "req", children: " *" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", value: nameAr, onChange: (e) => setNameAr(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.suppliers.phone1 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            className: "field",
            dir: "ltr",
            inputMode: "tel",
            value: phone1,
            onChange: (e) => setPhone1(toAsciiDigits(e.target.value))
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.suppliers.phone2 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            className: "field",
            dir: "ltr",
            inputMode: "tel",
            value: phone2,
            onChange: (e) => setPhone2(toAsciiDigits(e.target.value))
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.suppliers.taxNumber }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", dir: "ltr", value: taxNumber, onChange: (e) => setTaxNumber(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield span2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.suppliers.address }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", value: address, onChange: (e) => setAddress(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.suppliers.openingBalance }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(MoneyInput, { value: openingBalance, onChange: setOpeningBalance, disabled: Boolean(existing) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.suppliers.paymentTermsDays }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            className: "field",
            dir: "ltr",
            inputMode: "numeric",
            value: paymentTermsDays,
            onChange: (e) => setPaymentTermsDays(toAsciiDigits(e.target.value))
          }
        )
      ] })
    ] }) })
  ] });
}
let keySeq$3 = 1;
const newLine = () => ({
  key: keySeq$3++,
  item: null,
  itemQuery: "",
  itemResults: [],
  unitOptions: [],
  unitId: null,
  unitFactor: 1,
  qtyInUnit: "",
  bonusInUnit: "",
  batchNumber: "",
  expiryDate: "",
  unitPurchasePrice: null,
  discountPct: "",
  taxPct: ""
});
function PurchaseForm({ onSaved, onCancel }) {
  const [supplierQuery, setSupplierQuery] = reactExports.useState("");
  const [supplierResults, setSupplierResults] = reactExports.useState([]);
  const [supplier, setSupplier] = reactExports.useState(null);
  const [supplierBalance, setSupplierBalance] = reactExports.useState(null);
  const [warehouses, setWarehouses] = reactExports.useState([]);
  const [warehouseId, setWarehouseId] = reactExports.useState(null);
  const [supplierInvoiceNo, setSupplierInvoiceNo] = reactExports.useState("");
  const [purchaseType, setPurchaseType] = reactExports.useState("credit");
  const [invoiceDate, setInvoiceDate] = reactExports.useState(() => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
  const [expenses, setExpenses] = reactExports.useState(null);
  const [extraDiscountAmt, setExtraDiscountAmt] = reactExports.useState(null);
  const [notes, setNotes] = reactExports.useState("");
  const [lines, setLines] = reactExports.useState([newLine()]);
  const [error, setError] = reactExports.useState(null);
  const [saving, setSaving] = reactExports.useState(false);
  const savedInvoiceId = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!window.api) return;
    void window.api.warehouses.list().then((list) => {
      setWarehouses(list);
      const def = list.find((w2) => w2.isDefault);
      if (def) setWarehouseId(def.id);
    });
  }, []);
  reactExports.useEffect(() => {
    if (!window.api || !supplierQuery.trim()) {
      setSupplierResults([]);
      return;
    }
    const t2 = setTimeout(() => {
      void window.api.suppliers.search(supplierQuery, 10).then(setSupplierResults);
    }, 120);
    return () => clearTimeout(t2);
  }, [supplierQuery]);
  reactExports.useEffect(() => {
    if (!supplier || !window.api) {
      setSupplierBalance(null);
      return;
    }
    void window.api.suppliers.balance(supplier.id).then(setSupplierBalance);
  }, [supplier]);
  function selectSupplier(s) {
    setSupplier(s);
    setSupplierQuery(s.nameAr);
    setSupplierResults([]);
  }
  function updateLine(key, patch) {
    setLines((prev) => prev.map((l2) => l2.key === key ? { ...l2, ...patch } : l2));
  }
  function searchItemsForLine(key, query) {
    updateLine(key, { itemQuery: query, item: null, itemResults: [] });
    if (!window.api || query.trim() === "") return;
    void window.api.items.search(query, 10).then((results) => updateLine(key, { itemResults: results }));
  }
  function selectItemForLine(key, item) {
    updateLine(key, {
      item,
      itemQuery: item.nameAr,
      itemResults: [],
      unitOptions: [],
      unitId: null,
      // Default to the item's base unit factor; refined once units are
      // fetched. Purchase entry works in whatever unit the pharmacist types.
      unitFactor: 1
    });
    if (!window.api) return;
    void window.api.items.get(item.id).then((detail) => {
      const options = detail?.units.map((u2) => ({ id: u2.id, nameAr: u2.nameAr, factor: u2.factor })) ?? [];
      const defaultUnit = detail?.units.find((u2) => u2.isDefaultSale) ?? detail?.units[0];
      if (defaultUnit) updateLine(key, { unitOptions: options, unitId: defaultUnit.id, unitFactor: defaultUnit.factor });
      else updateLine(key, { unitOptions: options });
    });
  }
  const preview = reactExports.useMemo(() => {
    const inputs = [];
    const valid = lines.filter((l2) => l2.item && Number(l2.qtyInUnit) > 0 && l2.unitPurchasePrice != null);
    for (const l2 of valid) {
      const qtyBase = toBaseUnits(Number(l2.qtyInUnit), l2.unitFactor);
      const bonusBase = l2.bonusInUnit ? toBaseUnits(Number(l2.bonusInUnit), l2.unitFactor) : 0;
      const beforeDiscount = Number(l2.qtyInUnit) * (l2.unitPurchasePrice ?? 0);
      const discountAmt = Math.round(beforeDiscount * Number(l2.discountPct || 0) / 100);
      const afterDiscount = beforeDiscount - discountAmt;
      const taxAmt = Math.round(afterDiscount * Number(l2.taxPct || 0) / 100);
      const afterTax = afterDiscount + taxAmt;
      inputs.push({ lineNo: l2.key, lineTotal: afterTax, qtyBase, bonusBase });
    }
    if (inputs.length === 0) return { subtotal: 0, taxTotal: 0, total: 0, costs: /* @__PURE__ */ new Map() };
    const costs = landedCost(inputs, expenses ?? 0, extraDiscountAmt ?? 0);
    const subtotal = valid.reduce((s, l2) => s + Number(l2.qtyInUnit) * (l2.unitPurchasePrice ?? 0), 0);
    const total = inputs.reduce((s, i) => s + i.lineTotal, 0) + (expenses ?? 0) - (extraDiscountAmt ?? 0);
    return {
      subtotal,
      taxTotal: 0,
      total,
      costs: new Map(costs.map((c) => [c.lineNo, c.landedUnitCost]))
    };
  }, [lines, expenses, extraDiscountAmt]);
  async function submit(confirmAfterSave) {
    setError(null);
    if (!supplier) return setError(ar.purchases.errors.noSupplier);
    if (!warehouseId) return setError(ar.purchases.errors.noWarehouse);
    const validLines = lines.filter((l2) => l2.item);
    if (validLines.length === 0) return setError(ar.purchases.errors.noLines);
    if (validLines.some((l2) => Number(l2.qtyInUnit) <= 0)) return setError(ar.purchases.errors.qtyRequired);
    if (validLines.some((l2) => l2.unitId == null)) return setError(ar.purchases.errors.itemRequired);
    if (validLines.some((l2) => !l2.item.noExpiry && !l2.expiryDate)) {
      return setError(ar.purchases.errors.expiryRequired);
    }
    if (!window.api) return setError(ar.status.noBridge);
    setSaving(true);
    try {
      const input = {
        supplierInvoiceNo: supplierInvoiceNo.trim() || `AUTO-${Date.now()}`,
        supplierId: supplier.id,
        warehouseId,
        purchaseType,
        invoiceDate,
        expenses: expenses ?? 0,
        extraDiscountAmt: extraDiscountAmt ?? 0,
        notes: notes.trim() || null,
        lines: validLines.map((l2, i) => ({
          lineNo: i + 1,
          itemId: l2.item.id,
          unitId: l2.unitId,
          qtyInUnit: Number(l2.qtyInUnit),
          qtyBase: toBaseUnits(Number(l2.qtyInUnit), l2.unitFactor),
          bonusInUnit: l2.bonusInUnit ? Number(l2.bonusInUnit) : 0,
          bonusBase: l2.bonusInUnit ? toBaseUnits(Number(l2.bonusInUnit), l2.unitFactor) : 0,
          batchNumber: l2.batchNumber.trim() || null,
          expiryDate: l2.expiryDate || null,
          unitPurchasePrice: l2.unitPurchasePrice ?? 0,
          discountPct: Number(l2.discountPct || 0),
          taxPct: Number(l2.taxPct || 0)
        }))
      };
      const id2 = await window.api.purchases.create(input);
      savedInvoiceId.current = id2;
      if (confirmAfterSave) {
        await window.api.purchases.confirm(id2);
      }
      onSaved();
    } catch (err) {
      setError(`${ar.purchases.errors.saveFailed}: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }
  reactExports.useEffect(
    () => attachShortcuts([
      { id: "cancel", code: "Escape", run: onCancel },
      { id: "addRow", code: "F12", run: () => setLines((prev) => [...prev, newLine()]) }
    ]),
    [onCancel]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "item-form", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "item-form__toolbar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--primary", onClick: () => void submit(false), disabled: saving, children: ar.purchases.save }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--primary", onClick: () => void submit(true), disabled: saving, children: ar.purchases.confirm }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn", onClick: onCancel, disabled: saving, children: ar.items.actions.cancel })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "hint", children: ar.purchases.confirmWarning }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield field-wrap", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "formfield__label", children: [
            ar.purchases.supplier,
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "req", children: " *" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "field",
              value: supplierQuery,
              placeholder: ar.purchases.supplierSearch,
              onChange: (e) => {
                setSupplierQuery(e.target.value);
                setSupplier(null);
              }
            }
          ),
          supplierResults.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "autocomplete", children: supplierResults.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => selectSupplier(s), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: s.nameAr }),
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { dir: "ltr", children: [
              "#",
              s.code
            ] })
          ] }) }, s.id)) })
        ] }),
        supplier && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.purchases.supplierBalance }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { dir: "ltr", className: "strong", children: supplierBalance === null ? "—" : fromPiastres(supplierBalance) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "formfield__label", children: [
            ar.purchases.warehouse,
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "req", children: " *" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "select",
            {
              className: "field",
              value: warehouseId ?? "",
              onChange: (e) => setWarehouseId(Number(e.target.value)),
              children: warehouses.map((w2) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: w2.id, children: w2.nameAr }, w2.id))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.purchases.purchaseType }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "field",
              value: purchaseType,
              onChange: (e) => setPurchaseType(e.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "cash", children: ar.purchases.cash }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "credit", children: ar.purchases.credit })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.purchases.supplierInvoiceNo }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "field",
              dir: "ltr",
              value: supplierInvoiceNo,
              onChange: (e) => setSupplierInvoiceNo(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.purchases.invoiceDate }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "field",
              type: "date",
              dir: "ltr",
              value: invoiceDate,
              onChange: (e) => setInvoiceDate(e.target.value)
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "fieldset", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { children: ar.items.tabs.pricing }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "subtable", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "col--wide", children: ar.purchases.grid.item }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchases.grid.unit }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchases.grid.qty }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchases.grid.bonus }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchases.grid.batchNumber }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchases.grid.expiryDate }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchases.grid.price }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchases.grid.discount }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchases.grid.tax }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchases.grid.landedCost }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: lines.map((line) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "field-wrap", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  className: "field",
                  value: line.itemQuery,
                  onChange: (e) => searchItemsForLine(line.key, e.target.value)
                }
              ),
              line.itemResults.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "autocomplete", children: line.itemResults.map((it) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => selectItemForLine(line.key, it), children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: it.nameAr }) }) }, it.id)) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                className: "field",
                value: line.unitId ?? "",
                disabled: line.unitOptions.length === 0,
                onChange: (e) => {
                  const chosen = line.unitOptions.find((u2) => u2.id === Number(e.target.value));
                  if (chosen) updateLine(line.key, { unitId: chosen.id, unitFactor: chosen.factor });
                },
                children: [
                  line.unitOptions.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "—" }),
                  line.unitOptions.map((u2) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: u2.id, children: u2.nameAr }, u2.id))
                ]
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "field",
                dir: "ltr",
                inputMode: "decimal",
                value: line.qtyInUnit,
                onChange: (e) => updateLine(line.key, { qtyInUnit: toAsciiDigits(e.target.value) })
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "field",
                dir: "ltr",
                inputMode: "decimal",
                value: line.bonusInUnit,
                onChange: (e) => updateLine(line.key, { bonusInUnit: toAsciiDigits(e.target.value) })
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "field",
                dir: "ltr",
                value: line.batchNumber,
                onChange: (e) => updateLine(line.key, { batchNumber: e.target.value })
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "field",
                type: "date",
                dir: "ltr",
                value: line.expiryDate,
                onChange: (e) => updateLine(line.key, { expiryDate: e.target.value })
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              MoneyInput,
              {
                value: line.unitPurchasePrice,
                onChange: (v2) => updateLine(line.key, { unitPurchasePrice: v2 })
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "field",
                dir: "ltr",
                inputMode: "decimal",
                value: line.discountPct,
                onChange: (e) => updateLine(line.key, { discountPct: toAsciiDigits(e.target.value) })
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "field",
                dir: "ltr",
                inputMode: "decimal",
                value: line.taxPct,
                onChange: (e) => updateLine(line.key, { taxPct: toAsciiDigits(e.target.value) })
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", className: "center", children: preview.costs.has(line.key) ? fromPiastres(preview.costs.get(line.key)) : "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                className: "btn btn--danger btn--sm",
                onClick: () => setLines((prev) => prev.filter((l2) => l2.key !== line.key)),
                disabled: lines.length === 1,
                children: ar.purchases.grid.remove
              }
            ) })
          ] }, line.key)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--sm", onClick: () => setLines((prev) => [...prev, newLine()]), children: ar.items.actions.addRow })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.purchases.expenses }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MoneyInput, { value: expenses, onChange: setExpenses })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.purchases.extraDiscountAmt }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MoneyInput, { value: extraDiscountAmt, onChange: setExtraDiscountAmt })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield span2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.purchases.notes }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", value: notes, onChange: (e) => setNotes(e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stats", style: { marginBlockStart: "var(--space-3)" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.purchases.subtotal, value: fromPiastres(preview.subtotal), neutral: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.purchases.total, value: fromPiastres(preview.total), good: true })
      ] })
    ] })
  ] });
}
const STATUS_LABEL = {
  draft: ar.purchases.statusDraft,
  held: ar.purchases.statusHeld,
  confirmed: ar.purchases.statusConfirmed,
  voided: ar.purchases.statusVoided
};
const STATUS_BADGE = {
  draft: "badge badge--muted",
  held: "badge badge--warning",
  confirmed: "badge badge--success",
  voided: "badge badge--error"
};
function PurchasesScreen() {
  const [mode, setMode] = reactExports.useState({ view: "list" });
  const [rows, setRows] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  async function load() {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(await window.api.purchases.list({ limit: 200 }));
    } catch (err) {
      setError(`${ar.purchases.errors.loadFailed}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    if (mode.view === "list") void load();
  }, [mode.view]);
  if (mode.view === "form") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(PurchaseForm, { onSaved: () => setMode({ view: "list" }), onCancel: () => setMode({ view: "list" }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "items", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "items__bar", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--primary", onClick: () => setMode({ view: "form" }), children: ar.purchases.add }) }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableSkeleton, { cols: 5 }) : rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { title: ar.purchases.empty }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "datatable", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchases.serial }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchases.supplierInvoiceNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchases.invoiceDate }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchases.status }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchases.total })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: rows.map((r2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: r2.serial }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: r2.supplierInvoiceNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: r2.invoiceDate }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: STATUS_BADGE[r2.status] ?? "badge badge--muted", children: STATUS_LABEL[r2.status] ?? r2.status }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: fromPiastres(r2.total) })
      ] }, r2.id)) })
    ] })
  ] });
}
function StockScreen() {
  const [query, setQuery] = reactExports.useState("");
  const [rows, setRows] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [selected, setSelected] = reactExports.useState(null);
  const debounce = reactExports.useRef();
  async function load(q2) {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(await window.api.stock.search(q2, 200));
    } catch (err) {
      setError(`${ar.stock.errors.loadFailed}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    void load("");
  }, []);
  reactExports.useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void load(query), 120);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);
  if (selected) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      BatchDetail,
      {
        item: selected,
        onBack: () => {
          setSelected(null);
          void load(query);
        }
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "items", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "items__bar", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        className: "field items__search",
        placeholder: ar.stock.search,
        value: query,
        onChange: (e) => setQuery(e.target.value)
      }
    ) }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableSkeleton, { cols: 6 }) : rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { title: query.trim() ? ar.stock.noResults : ar.stock.empty }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "datatable", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.items.fields.code }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.items.fields.nameAr }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.stock.onHand }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.stock.nearestExpiry }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.stock.stockValue }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: rows.map((r2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { onDoubleClick: () => setSelected(r2), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: r2.code }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r2.nameAr }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { dir: "ltr", children: [
          r2.qtyOnHand,
          r2.qtyOnHand === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "badge badge--error", children: [
            " ",
            ar.stock.outOfStock
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: r2.nearestExpiry ?? ar.stock.noExpiry }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: fromPiastres(r2.stockValue) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "datatable__actions", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--sm", onClick: () => setSelected(r2), children: ar.stock.batches }) })
      ] }, r2.itemId)) })
    ] })
  ] });
}
function BatchDetail({ item, onBack }) {
  const [batches, setBatches] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [movesFor, setMovesFor] = reactExports.useState(null);
  const [moves, setMoves] = reactExports.useState([]);
  const [ledgerCheck, setLedgerCheck] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!window.api) return;
    setLoading(true);
    void window.api.stock.batches(item.itemId).then((b) => {
      setBatches(b);
      setLoading(false);
    });
  }, [item.itemId]);
  async function showMoves(batch) {
    if (!window.api) return;
    setMovesFor(batch.id);
    setLedgerCheck(null);
    const list = await window.api.stock.batchMoves(batch.id);
    setMoves(list);
    const sum = list.reduce((s, m2) => s + m2.qtyDelta, 0);
    setLedgerCheck({ matches: sum === batch.qtyOnHand });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "items", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "items__bar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn", onClick: onBack, children: ar.stock.back }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "section-heading section-heading--inline", children: item.nameAr })
    ] }),
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableSkeleton, { cols: 6 }) : batches.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { title: ar.stock.noBatches }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "datatable", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.stock.batchNumber }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.stock.expiryDate }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.stock.onHand }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.stock.unitCost }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.stock.receivedAt }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: batches.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: b.batchNumber ?? "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: b.expiryDate ?? ar.stock.noExpiry }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { dir: "ltr", children: [
          b.qtyOnHand,
          Boolean(b.isQuarantined) && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "badge badge--muted", children: [
            " ",
            ar.stock.quarantined
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: fromPiastres(b.unitCost) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: b.receivedAt.slice(0, 10) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "datatable__actions", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--sm", onClick: () => void showMoves(b), children: ar.stock.moves }) })
      ] }, b.id)) })
    ] }),
    movesFor !== null && /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "fieldset", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { children: ar.stock.moves }),
      ledgerCheck && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: ledgerCheck.matches ? "hint" : "alert alert--error", children: ledgerCheck.matches ? ar.stock.ledgerMatches : ar.stock.ledgerMismatch }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "subtable", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchases.invoiceDate }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.stock.moveTypeLabel }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.stock.qtyDelta }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.stock.unitCost })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: moves.map((m2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: m2.at.slice(0, 16) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: ar.stock.moveType[m2.moveType] ?? m2.moveType }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: m2.qtyDelta > 0 ? `+${m2.qtyDelta}` : m2.qtyDelta }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: fromPiastres(m2.unitCost) })
        ] }, m2.id)) })
      ] })
    ] })
  ] });
}
const ToastContext = reactExports.createContext(null);
const AUTO_DISMISS_MS = 3500;
function ToastProvider({ children }) {
  const [toasts, setToasts] = reactExports.useState([]);
  const nextId = reactExports.useRef(1);
  const dismiss = reactExports.useCallback((id2) => {
    setToasts((prev) => prev.filter((t2) => t2.id !== id2));
  }, []);
  const showToast = reactExports.useCallback(
    (message, variant = "success") => {
      const id2 = nextId.current++;
      setToasts((prev) => [...prev, { id: id2, message, variant }]);
      setTimeout(() => dismiss(id2), AUTO_DISMISS_MS);
    },
    [dismiss]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ToastContext.Provider, { value: { showToast }, children: [
    children,
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "toast-host", role: "status", "aria-live": "polite", children: toasts.map((t2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `toast toast--${t2.variant}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "toast__icon", "aria-hidden": "true", children: t2.variant === "success" ? "✓" : t2.variant === "error" ? "×" : "ℹ" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "toast__message", children: t2.message }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "toast__close", onClick: () => dismiss(t2.id), "aria-label": "إغلاق", children: "×" })
    ] }, t2.id)) })
  ] });
}
function useToast() {
  const ctx = reactExports.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
function parseQty(text) {
  const n2 = Number(toAsciiDigits(text));
  return Number.isFinite(n2) && n2 > 0 ? n2 : 0;
}
function parseDiscountPiastres(text) {
  const trimmed = toAsciiDigits(text).trim();
  if (trimmed === "") return 0;
  try {
    const piastres = toPiastres(trimmed);
    return piastres > 0 ? piastres : 0;
  } catch {
    return 0;
  }
}
let keySeq$2 = 1;
function SalesScreen() {
  const [warehouseId, setWarehouseId] = reactExports.useState(null);
  const [warehouseName, setWarehouseName] = reactExports.useState("");
  const [query, setQuery] = reactExports.useState("");
  const [results, setResults] = reactExports.useState([]);
  const [cart, setCart] = reactExports.useState([]);
  const [invoiceType, setInvoiceType] = reactExports.useState("cash");
  const [paidCash, setPaidCash] = reactExports.useState(null);
  const [customer, setCustomer] = reactExports.useState(null);
  const [customerQuery, setCustomerQuery] = reactExports.useState("");
  const [customerResults, setCustomerResults] = reactExports.useState([]);
  const [error, setError] = reactExports.useState(null);
  const { showToast } = useToast();
  const [saving, setSaving] = reactExports.useState(false);
  const searchRef = reactExports.useRef(null);
  const debounce = reactExports.useRef();
  const customerDebounce = reactExports.useRef();
  reactExports.useEffect(() => {
    if (!window.api) return;
    void window.api.warehouses.list().then((list) => {
      const def = list.find((w2) => w2.isDefault) ?? list[0];
      if (def) {
        setWarehouseId(def.id);
        setWarehouseName(def.nameAr);
      }
    });
  }, []);
  reactExports.useEffect(() => searchRef.current?.focus(), []);
  async function addItemToCart(item) {
    if (!window.api) return;
    const detail = await window.api.items.get(item.id);
    const unit = detail?.units.find((u2) => u2.isDefaultSale) ?? detail?.units[0];
    if (!unit) {
      setError(`${item.nameAr}: لا توجد وحدة بيع محددة لهذا الصنف`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l2) => l2.item.id === item.id && l2.unitId === unit.id);
      if (existing) {
        return prev.map((l2) => l2 === existing ? { ...l2, qty: String(parseQty(l2.qty) + 1) } : l2);
      }
      return [
        ...prev,
        {
          key: keySeq$2++,
          item,
          unitId: unit.id,
          unitFactor: unit.factor,
          qty: "1",
          unitPrice: unit.salePrice,
          discountEgp: "0"
        }
      ];
    });
    setQuery("");
    setResults([]);
    searchRef.current?.focus();
  }
  useBarcodeScanner(
    async (event) => {
      if (!window.api) return;
      const item = await window.api.items.findByBarcode(event.code);
      if (item) {
        await addItemToCart(item);
      } else {
        setError(`الباركود غير موجود: ${event.code}`);
      }
    },
    {
      config: loadScannerConfig(),
      shouldIgnore: () => {
        const el2 = document.activeElement;
        return el2?.tagName === "SELECT";
      }
    }
  );
  reactExports.useEffect(() => {
    if (!window.api || !query.trim()) {
      setResults([]);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      void window.api.items.search(query, 10).then(setResults);
    }, 120);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);
  reactExports.useEffect(() => {
    if (!window.api || !customerQuery.trim()) {
      setCustomerResults([]);
      return;
    }
    if (customerDebounce.current) clearTimeout(customerDebounce.current);
    customerDebounce.current = setTimeout(() => {
      void window.api.customers.search(customerQuery, 10).then(setCustomerResults);
    }, 120);
    return () => {
      if (customerDebounce.current) clearTimeout(customerDebounce.current);
    };
  }, [customerQuery]);
  function selectInvoiceType(next) {
    setInvoiceType(next);
    if (next === "cash") {
      setCustomer(null);
      setCustomerQuery("");
      setCustomerResults([]);
    }
  }
  function selectCustomer(c) {
    setCustomer(c);
    setCustomerQuery("");
    setCustomerResults([]);
  }
  function updateLine(key, patch) {
    setCart((prev) => prev.map((l2) => l2.key === key ? { ...l2, ...patch } : l2));
  }
  function removeLine(key) {
    setCart((prev) => prev.filter((l2) => l2.key !== key));
  }
  const totals = cart.reduce(
    (acc, l2) => {
      const before = parseQty(l2.qty) * l2.unitPrice;
      const discount = Math.min(parseDiscountPiastres(l2.discountEgp), before);
      acc.subtotal += before;
      acc.total += before - discount;
      return acc;
    },
    { subtotal: 0, total: 0 }
  );
  const change = paidCash !== null ? paidCash - totals.total : 0;
  async function checkout() {
    setError(null);
    if (!warehouseId) return setError(ar.sales.errors.noWarehouse);
    if (cart.length === 0) return setError(ar.sales.errors.noLines);
    if (cart.some((l2) => parseQty(l2.qty) <= 0)) return setError(ar.sales.errors.invalidQty);
    if (invoiceType === "cash" && (paidCash ?? 0) < totals.total) {
      return setError(ar.sales.errors.insufficientPaid);
    }
    if (invoiceType === "credit" && !customer) return setError(ar.sales.errors.noCustomer);
    if (!window.api) return setError(ar.status.noBridge);
    setSaving(true);
    try {
      const invoiceId = await window.api.sales.create({
        warehouseId,
        invoiceType,
        customerId: invoiceType === "credit" ? customer.id : null,
        // A credit invoice's total is owed on the customer's account, not
        // paid in cash — recording it as paidCash: totals.total here would
        // both mark the invoice fully paid AND post the full amount to the
        // customer's ledger (postCreditSale), double-counting the money.
        paidCash: invoiceType === "cash" ? paidCash ?? totals.total : 0,
        lines: cart.map((l2, i) => {
          const before = parseQty(l2.qty) * l2.unitPrice;
          return {
            lineNo: i + 1,
            itemId: l2.item.id,
            unitId: l2.unitId,
            unitFactor: l2.unitFactor,
            qtyInUnit: parseQty(l2.qty),
            unitPrice: l2.unitPrice,
            discountAmt: Math.min(parseDiscountPiastres(l2.discountEgp), before)
          };
        })
      });
      await window.api.sales.confirm(invoiceId);
      const invoice = await window.api.sales.get(invoiceId);
      showToast(ar.sales.confirmed.replace("{serial}", String(invoice?.serial ?? invoiceId)));
      setCart([]);
      setPaidCash(null);
      setCustomer(null);
      searchRef.current?.focus();
    } catch (err) {
      const message = err.message;
      setError(
        /available across sellable batches/.test(message) ? ar.sales.errors.outOfStock : `${ar.sales.errors.confirmFailed}: ${message}`
      );
    } finally {
      setSaving(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pos", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pos__search-bar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          ref: searchRef,
          className: "field pos__search",
          placeholder: ar.sales.itemSearch,
          value: query,
          onChange: (e) => setQuery(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter" && results[0]) void addItemToCart(results[0]);
          }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "pos__warehouse", children: [
        ar.sales.warehouse,
        ": ",
        warehouseName
      ] }),
      results.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "autocomplete autocomplete--pos", children: results.map((it) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => void addItemToCart(it), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: it.nameAr }),
        it.publicPrice !== null && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { dir: "ltr", children: fromPiastres(it.publicPrice) })
      ] }) }, it.id)) })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
    cart.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { title: ar.sales.emptyCart }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "datatable", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.items.fields.nameAr }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.sales.qty }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.sales.unitPrice }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.sales.discount }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.sales.afterDiscount }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: cart.map((l2) => {
        const before = parseQty(l2.qty) * l2.unitPrice;
        const after = before - Math.min(parseDiscountPiastres(l2.discountEgp), before);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: l2.item.nameAr }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "field field--sm",
              dir: "ltr",
              inputMode: "decimal",
              value: l2.qty,
              onChange: (e) => updateLine(l2.key, { qty: e.target.value })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: fromPiastres(l2.unitPrice) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "field field--xs",
              dir: "ltr",
              inputMode: "decimal",
              value: l2.discountEgp,
              onChange: (e) => updateLine(l2.key, { discountEgp: toAsciiDigits(e.target.value) })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: fromPiastres(after) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--danger btn--sm", onClick: () => removeLine(l2.key), children: ar.sales.remove }) })
        ] }, l2.key);
      }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pos__footer", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.sales.invoiceType }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "field",
              value: invoiceType,
              onChange: (e) => selectInvoiceType(e.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "cash", children: ar.sales.cash }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "credit", children: ar.sales.credit })
              ]
            }
          )
        ] }),
        invoiceType === "cash" && /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.sales.paidCash }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MoneyInput, { value: paidCash, onChange: setPaidCash })
        ] }),
        invoiceType === "credit" && /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "formfield__label", children: [
            ar.sales.customer,
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "req", children: " *" })
          ] }),
          customer ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pos__customer-picked", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              customer.name,
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { dir: "ltr", children: [
                "#",
                customer.code
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--sm", onClick: () => setCustomer(null), children: ar.sales.changeCustomer })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field-wrap", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "field",
                placeholder: ar.sales.customerSearch,
                value: customerQuery,
                onChange: (e) => setCustomerQuery(e.target.value)
              }
            ),
            customerResults.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "autocomplete autocomplete--offset", children: customerResults.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => selectCustomer(c), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: c.name }),
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { dir: "ltr", children: [
                "#",
                c.code
              ] })
            ] }) }, c.id)) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stats", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.sales.itemCount, value: String(cart.length), neutral: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.sales.total, value: fromPiastres(totals.total), good: true }),
        invoiceType === "cash" && paidCash !== null && /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.sales.change, value: fromPiastres(Math.max(change, 0)), neutral: true })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: "btn btn--primary",
          onClick: () => void checkout(),
          disabled: saving || cart.length === 0 || invoiceType === "credit" && !customer,
          children: invoiceType === "cash" ? ar.sales.confirmCash : ar.sales.confirmCredit
        }
      )
    ] })
  ] });
}
function ShiftHandoverScreen() {
  const [warehouseId, setWarehouseId] = reactExports.useState(null);
  const [warehouseName, setWarehouseName] = reactExports.useState("");
  const [shift, setShift] = reactExports.useState(null);
  const [summary, setSummary] = reactExports.useState(null);
  const [transactions, setTransactions] = reactExports.useState([]);
  const [expectedCash, setExpectedCash] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const { showToast } = useToast();
  const [openingFloat, setOpeningFloat] = reactExports.useState(null);
  const [txDirection, setTxDirection] = reactExports.useState("out");
  const [txAmount, setTxAmount] = reactExports.useState(null);
  const [txCategory, setTxCategory] = reactExports.useState("");
  const [countedCash, setCountedCash] = reactExports.useState(null);
  const [varianceNote, setVarianceNote] = reactExports.useState("");
  async function load() {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const warehouses = await window.api.warehouses.list();
      const def = warehouses.find((w2) => w2.isDefault) ?? warehouses[0];
      if (!def) return;
      setWarehouseId(def.id);
      setWarehouseName(def.nameAr);
      const open = await window.api.shifts.getOpen(def.id);
      setShift(open);
      if (open) {
        const [s, tx, expected] = await Promise.all([
          window.api.shifts.salesSummary(open.id),
          window.api.shifts.cashTransactions(open.id),
          window.api.shifts.computeExpectedCash(open.id)
        ]);
        setSummary(s);
        setTransactions(tx);
        setExpectedCash(expected);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    void load();
  }, []);
  async function handleOpen() {
    if (!window.api || !warehouseId) return;
    setError(null);
    if (openingFloat !== null && openingFloat < 0) return setError(ar.shifts.errors.negativeAmount);
    try {
      await window.api.shifts.open(warehouseId, openingFloat ?? 0);
      setOpeningFloat(null);
      await load();
    } catch (err) {
      setError(`${ar.shifts.errors.openFailed}: ${err.message}`);
    }
  }
  async function handleAddCash() {
    if (!window.api || !shift || txAmount === null || txAmount <= 0) return;
    setError(null);
    try {
      await window.api.shifts.recordCash(shift.id, txDirection, txAmount, null, txCategory.trim() || null);
      setTxAmount(null);
      setTxCategory("");
      await load();
    } catch (err) {
      setError(`${ar.shifts.errors.cashTxFailed}: ${err.message}`);
    }
  }
  async function handleClose() {
    if (!window.api || !shift || countedCash === null) return;
    setError(null);
    if (countedCash < 0) return setError(ar.shifts.errors.negativeAmount);
    const variance = countedCash - (expectedCash ?? 0);
    if (variance !== 0 && !varianceNote.trim()) return setError(ar.shifts.varianceRequired);
    try {
      await window.api.shifts.close(shift.id, {
        countedCash,
        varianceNote: varianceNote.trim() || null
      });
      showToast(ar.shifts.closed);
      setCountedCash(null);
      setVarianceNote("");
      await load();
    } catch (err) {
      setError(`${ar.shifts.errors.closeFailed}: ${err.message}`);
    }
  }
  if (loading) return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: ar.items.loading });
  if (!shift) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stack", children: [
      error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel stack", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: ar.shifts.noOpenShift }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.shifts.warehouse }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", value: warehouseName, disabled: true })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.shifts.openingFloat }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MoneyInput, { value: openingFloat, onChange: setOpeningFloat })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "btn-row", style: { marginBlockStart: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn--primary",
            onClick: () => void handleOpen(),
            disabled: openingFloat !== null && openingFloat < 0,
            children: ar.shifts.openShift
          }
        ) })
      ] })
    ] });
  }
  const previewVariance = countedCash !== null && expectedCash !== null ? countedCash - expectedCash : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stack", children: [
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stats", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.shifts.openingFloat, value: fromPiastres(shift.openingFloat), neutral: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.shifts.cashSalesCount, value: String(summary?.count ?? 0), neutral: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.shifts.cashTotal, value: fromPiastres(summary?.cashTotal ?? 0), good: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.shifts.creditTotal, value: fromPiastres(summary?.creditTotal ?? 0), neutral: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.shifts.expectedCash, value: fromPiastres(expectedCash ?? 0), good: true })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "muted small", dir: "ltr", style: { marginBlockStart: "var(--space-3)" }, children: [
        ar.shifts.openedAt,
        ": ",
        shift.openedAt.slice(0, 16)
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "fieldset", style: { marginBlockStart: 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { children: ar.shifts.transactionsTitle }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.shifts.category }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "field", value: txDirection, onChange: (e) => setTxDirection(e.target.value), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "out", children: ar.shifts.cashOut }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "in", children: ar.shifts.cashIn })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.shifts.amount }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MoneyInput, { value: txAmount, onChange: setTxAmount })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.shifts.note }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", value: txCategory, onChange: (e) => setTxCategory(e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "btn-row", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--sm", onClick: () => void handleAddCash(), children: ar.shifts.addTransaction }) })
    ] }),
    transactions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "section-heading", children: ar.shifts.transactionsLog }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "datatable", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchases.invoiceDate }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.shifts.category }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.shifts.amount }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.shifts.note })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: transactions.map((t2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: t2.at.slice(0, 16) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: t2.direction === "in" ? ar.shifts.cashIn : ar.shifts.cashOut }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: fromPiastres(t2.amount) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: t2.category ?? "—" })
        ] }, t2.id)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "fieldset", style: { marginBlockStart: 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { children: ar.shifts.closeShift }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.shifts.countedCash }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MoneyInput, { value: countedCash, onChange: setCountedCash })
        ] }),
        previewVariance !== null && previewVariance !== 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield span2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "formfield__label", children: [
            ar.shifts.varianceNote,
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "req", children: " *" }),
            " (",
            ar.shifts.variance,
            ": ",
            fromPiastres(previewVariance),
            ")"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", value: varianceNote, onChange: (e) => setVarianceNote(e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "btn-row", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: "btn btn--primary",
          onClick: () => void handleClose(),
          disabled: countedCash === null || countedCash < 0 || previewVariance !== null && previewVariance !== 0 && !varianceNote.trim(),
          children: ar.shifts.closeShift
        }
      ) })
    ] })
  ] });
}
function CustomerForm({ existing, onSaved, onCancel }) {
  const [name, setName] = reactExports.useState(existing?.name ?? "");
  const [mobile1, setMobile1] = reactExports.useState(existing?.mobile1 ?? "");
  const [mobile2, setMobile2] = reactExports.useState(existing?.mobile2 ?? "");
  const [email, setEmail] = reactExports.useState(existing?.email ?? "");
  const [accountType, setAccountType] = reactExports.useState(
    existing?.accountType ?? "individual"
  );
  const [pharmacyOwnerName, setPharmacyOwnerName] = reactExports.useState("");
  const [pharmacyPhone, setPharmacyPhone] = reactExports.useState("");
  const [paymentMethod, setPaymentMethod] = reactExports.useState(
    existing?.paymentMethod ?? "cash"
  );
  const [openingBalance, setOpeningBalance] = reactExports.useState(existing?.openingBalance ?? null);
  const [creditLimit, setCreditLimit] = reactExports.useState(existing?.creditLimit ?? null);
  const [isVip, setIsVip] = reactExports.useState(Boolean(existing?.isVip));
  const [discountCashPct, setDiscountCashPct] = reactExports.useState(String(existing?.discountCashPct ?? 0));
  const [discountCreditPct, setDiscountCreditPct] = reactExports.useState(String(existing?.discountCreditPct ?? 0));
  const [discountInvoicePct, setDiscountInvoicePct] = reactExports.useState(String(existing?.discountInvoicePct ?? 0));
  const [tags, setTags] = reactExports.useState(existing?.tags ?? []);
  const [tagDraft, setTagDraft] = reactExports.useState("");
  const [notes, setNotes] = reactExports.useState("");
  const [error, setError] = reactExports.useState(null);
  const [saving, setSaving] = reactExports.useState(false);
  function addTag() {
    const t2 = tagDraft.trim();
    if (t2 && !tags.includes(t2)) setTags([...tags, t2]);
    setTagDraft("");
  }
  function isValidMobile(v2) {
    return /^\d{8,}$/.test(v2);
  }
  function parseDiscountPct(v2) {
    const n2 = Number(v2);
    if (!Number.isFinite(n2) || n2 < 0 || n2 > 100) return null;
    return n2;
  }
  async function submit() {
    setError(null);
    const mobile1Ascii = toAsciiDigits(mobile1.trim());
    const mobile2Ascii = toAsciiDigits(mobile2.trim());
    const pharmacyPhoneAscii = toAsciiDigits(pharmacyPhone.trim());
    if (!name.trim()) return setError(ar.customers.errors.nameRequired);
    if (!mobile1Ascii) return setError(ar.customers.errors.mobileRequired);
    if (!isValidMobile(mobile1Ascii)) return setError(ar.customers.errors.mobileInvalid);
    if (mobile2Ascii && !isValidMobile(mobile2Ascii)) return setError(ar.customers.errors.mobileInvalid);
    const cashPct = parseDiscountPct(discountCashPct);
    const creditPct = parseDiscountPct(discountCreditPct);
    const invoicePct = parseDiscountPct(discountInvoicePct);
    if (cashPct === null || creditPct === null || invoicePct === null) {
      return setError(ar.customers.errors.discountInvalid);
    }
    if (!window.api) return setError(ar.status.noBridge);
    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        mobile1: mobile1Ascii,
        mobile2: mobile2Ascii || null,
        email: email.trim() || null,
        accountType,
        pharmacyOwnerName: pharmacyOwnerName.trim() || null,
        pharmacyPhone: pharmacyPhoneAscii || null,
        paymentMethod,
        openingBalance: openingBalance ?? 0,
        creditLimit: paymentMethod === "credit" ? creditLimit : null,
        isVip,
        discountCashPct: cashPct,
        discountCreditPct: creditPct,
        discountInvoicePct: invoicePct,
        tags,
        notes: notes.trim() || null
      };
      if (existing) await window.api.customers.update(existing.id, input);
      else await window.api.customers.create(input);
      onSaved();
    } catch (err) {
      const message = err.message;
      setError(message.startsWith("[") ? ar.customers.errors.saveFailedValidation : `${ar.customers.errors.saveFailed}: ${message}`);
    } finally {
      setSaving(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "item-form", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "item-form__toolbar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--primary", onClick: () => void submit(), disabled: saving, children: ar.items.actions.save }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn", onClick: onCancel, disabled: saving, children: ar.items.actions.cancel }),
      existing && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "item-form__code", dir: "ltr", children: [
        ar.customers.code,
        ": ",
        existing.code
      ] })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "formfield__label", children: [
            ar.customers.name,
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "req", children: " *" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", value: name, onChange: (e) => setName(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "formfield__label", children: [
            ar.customers.mobile1,
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "req", children: " *" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", dir: "ltr", inputMode: "tel", value: mobile1, onChange: (e) => setMobile1(toAsciiDigits(e.target.value)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.customers.mobile2 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", dir: "ltr", inputMode: "tel", value: mobile2, onChange: (e) => setMobile2(toAsciiDigits(e.target.value)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.customers.email }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", dir: "ltr", value: email, onChange: (e) => setEmail(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.customers.accountType }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "field", value: accountType, onChange: (e) => setAccountType(e.target.value), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "individual", children: ar.customers.accountTypes.individual }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "pharmacy", children: ar.customers.accountTypes.pharmacy }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "clinic", children: ar.customers.accountTypes.clinic }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "company", children: ar.customers.accountTypes.company })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "check check--end", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: isVip, onChange: (e) => setIsVip(e.target.checked) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: ar.customers.isVip })
        ] })
      ] }),
      (accountType === "pharmacy" || accountType === "clinic") && /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "fieldset", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { children: ar.customers.pharmacyOwnerName }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.customers.pharmacyOwnerName }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", value: pharmacyOwnerName, onChange: (e) => setPharmacyOwnerName(e.target.value) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.customers.pharmacyPhone }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", dir: "ltr", inputMode: "tel", value: pharmacyPhone, onChange: (e) => setPharmacyPhone(toAsciiDigits(e.target.value)) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "fieldset", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { children: ar.customers.paymentMethod }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.customers.paymentMethod }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                className: "field",
                value: paymentMethod,
                onChange: (e) => {
                  const next = e.target.value;
                  setPaymentMethod(next);
                  if (next === "cash") setCreditLimit(null);
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "cash", children: ar.customers.cash }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "credit", children: ar.customers.credit })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.customers.openingBalance }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MoneyInput, { value: openingBalance, onChange: setOpeningBalance, disabled: Boolean(existing) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.customers.creditLimit }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              MoneyInput,
              {
                value: paymentMethod === "credit" ? creditLimit : null,
                onChange: setCreditLimit,
                placeholder: ar.customers.noLimit,
                disabled: paymentMethod !== "credit"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2 mt", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.customers.discountCashPct }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", dir: "ltr", inputMode: "decimal", value: discountCashPct, onChange: (e) => setDiscountCashPct(toAsciiDigits(e.target.value)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.customers.discountCreditPct }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", dir: "ltr", inputMode: "decimal", value: discountCreditPct, onChange: (e) => setDiscountCreditPct(toAsciiDigits(e.target.value)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.customers.discountInvoicePct }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", dir: "ltr", inputMode: "decimal", value: discountInvoicePct, onChange: (e) => setDiscountInvoicePct(toAsciiDigits(e.target.value)) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "fieldset", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { children: ar.customers.tags }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tag-row", children: tags.map((t2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "badge", children: [
          t2,
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "tag-remove", onClick: () => setTags(tags.filter((x2) => x2 !== t2)), children: "×" })
        ] }, t2)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            className: "field",
            placeholder: ar.customers.tagsHint,
            value: tagDraft,
            onChange: (e) => setTagDraft(e.target.value),
            onKeyDown: (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield mt", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.customers.notes }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", value: notes, onChange: (e) => setNotes(e.target.value) })
      ] })
    ] })
  ] });
}
function CustomersScreen({ initialQuery } = {}) {
  const [mode, setMode] = reactExports.useState({ view: "list" });
  const [rows, setRows] = reactExports.useState([]);
  const [query, setQuery] = reactExports.useState(initialQuery ?? "");
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const debounce = reactExports.useRef();
  async function load(q2) {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(q2.trim() ? await window.api.customers.search(q2, 200) : await window.api.customers.list());
    } catch (err) {
      setError(`${ar.customers.errors.loadFailed}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    if (mode.view === "list") void load(query);
  }, [mode.view]);
  reactExports.useEffect(() => {
    if (mode.view !== "list") return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void load(query), 120);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);
  async function openEdit(id2) {
    if (!window.api) return;
    const customer = await window.api.customers.get(id2);
    if (customer) setMode({ view: "edit", customer });
  }
  async function toggleSuspend(row) {
    if (!window.api) return;
    if (!row.isSuspended && !confirm(ar.customers.confirmSuspend)) return;
    try {
      if (row.isSuspended) await window.api.customers.unsuspend(row.id);
      else await window.api.customers.suspend(row.id);
      void load(query);
    } catch (err) {
      setError(`${ar.customers.errors.suspendFailed}: ${err.message}`);
    }
  }
  if (mode.view === "create" || mode.view === "edit") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      CustomerForm,
      {
        existing: mode.view === "edit" ? mode.customer : null,
        onSaved: () => setMode({ view: "list" }),
        onCancel: () => setMode({ view: "list" })
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "items", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "items__bar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "field items__search",
          placeholder: ar.customers.search,
          value: query,
          onChange: (e) => setQuery(e.target.value)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--primary", onClick: () => setMode({ view: "create" }), children: ar.customers.add })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableSkeleton, { cols: 5 }) : rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { title: query.trim() ? ar.customers.noResults : ar.customers.empty }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "datatable", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.customers.code }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.customers.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.customers.mobile1 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.customers.paymentMethod }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.customers.balance }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: rows.map((r2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { onDoubleClick: () => void openEdit(r2.id), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: r2.code }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          r2.name,
          Boolean(r2.isVip) && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge badge--info", children: " VIP" }),
          Boolean(r2.isSuspended) && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "badge badge--warning", children: [
            " ",
            ar.customers.suspended
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: r2.mobile1 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r2.paymentMethod === "credit" ? ar.customers.credit : ar.customers.cash }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: fromPiastres(r2.openingBalance) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "datatable__actions", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--sm", onClick: () => void openEdit(r2.id), children: ar.customers.edit }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--danger btn--sm", onClick: () => void toggleSuspend(r2), children: r2.isSuspended ? ar.customers.unsuspend : ar.customers.suspend })
        ] })
      ] }, r2.id)) })
    ] })
  ] });
}
function CustomerReportsScreen() {
  const [query, setQuery] = reactExports.useState("");
  const [results, setResults] = reactExports.useState([]);
  const [selected, setSelected] = reactExports.useState(null);
  const [balance, setBalance] = reactExports.useState(null);
  const [ledger, setLedger] = reactExports.useState([]);
  const [paymentAmount, setPaymentAmount] = reactExports.useState(null);
  const [paymentNote, setPaymentNote] = reactExports.useState("");
  const [error, setError] = reactExports.useState(null);
  const debounce = reactExports.useRef();
  reactExports.useEffect(() => {
    if (!window.api || !query.trim()) {
      setResults([]);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      window.api.customers.search(query, 10).then(setResults).catch((err) => setError(`${ar.customers.errors.loadFailed}: ${err.message}`));
    }, 120);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);
  async function selectCustomer(c) {
    setSelected(c);
    setQuery("");
    setResults([]);
    await refresh(c.id);
  }
  async function refresh(customerId) {
    if (!window.api) return;
    try {
      const [bal, led] = await Promise.all([
        window.api.customers.balance(customerId),
        window.api.customers.ledger(customerId)
      ]);
      setBalance(bal);
      setLedger(led);
    } catch (err) {
      setError(`${ar.customers.errors.loadFailed}: ${err.message}`);
    }
  }
  async function submitPayment() {
    if (!selected || !window.api || paymentAmount === null || paymentAmount <= 0) return;
    setError(null);
    try {
      await window.api.customers.recordPayment(selected.id, paymentAmount, paymentNote.trim() || null);
      setPaymentAmount(null);
      setPaymentNote("");
      await refresh(selected.id);
    } catch (err) {
      setError(`${ar.customers.errors.paymentFailed}: ${err.message}`);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stack", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "items__bar field-wrap", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "field items__search",
          placeholder: ar.customers.search,
          value: query,
          onChange: (e) => setQuery(e.target.value)
        }
      ),
      results.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "autocomplete autocomplete--offset", style: { maxInlineSize: "24rem" }, children: results.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => void selectCustomer(c), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: c.name }),
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { dir: "ltr", children: [
          "#",
          c.code
        ] })
      ] }) }, c.id)) })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
    !selected ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: ar.customers.selectCustomer }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel stack", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "section-heading", children: [
          selected.name,
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "muted small", dir: "ltr", children: [
            "#",
            selected.code
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stats", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.customers.balance, value: fromPiastres(balance ?? 0), good: (balance ?? 0) === 0 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Stat,
            {
              label: ar.customers.creditLimit,
              value: selected.creditLimit === null ? ar.customers.noLimit : fromPiastres(selected.creditLimit),
              neutral: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "fieldset", style: { marginBlockStart: 0 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { children: ar.customers.recordPayment }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.customers.paymentAmount }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MoneyInput, { value: paymentAmount, onChange: setPaymentAmount })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.customers.paymentNote }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", value: paymentNote, onChange: (e) => setPaymentNote(e.target.value) })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "btn-row", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--primary btn--sm", onClick: () => void submitPayment(), children: ar.customers.recordPayment }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "section-heading", children: ar.customers.ledgerTitle }),
        ledger.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: "—" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "datatable", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.customers.ledgerDate }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.customers.ledgerType }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.customers.ledgerDebit }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.customers.ledgerCredit }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.customers.ledgerBalance }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.customers.notes })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: ledger.map((l2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: l2.at.slice(0, 16) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: ar.customers.entryTypes[l2.entryType] ?? l2.entryType }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: l2.debit ? fromPiastres(l2.debit) : "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: l2.credit ? fromPiastres(l2.credit) : "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: fromPiastres(l2.balanceAfter) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: l2.note ?? "—" })
          ] }, l2.id)) })
        ] })
      ] })
    ] })
  ] });
}
function SalesReturnByInvoiceScreen() {
  const [serial, setSerial] = reactExports.useState("");
  const [invoiceId, setInvoiceId] = reactExports.useState(null);
  const [warehouseId, setWarehouseId] = reactExports.useState(null);
  const [customerId, setCustomerId] = reactExports.useState(null);
  const [lines, setLines] = reactExports.useState([]);
  const [refundMethod, setRefundMethod] = reactExports.useState("cash");
  const [reason, setReason] = reactExports.useState("");
  const [error, setError] = reactExports.useState(null);
  const { showToast } = useToast();
  async function findInvoice() {
    if (!window.api || !serial.trim()) return;
    setError(null);
    try {
      const serialNum = Number(serial.trim());
      const match = Number.isInteger(serialNum) ? await window.api.sales.getBySerial(serialNum) : null;
      if (!match) return setError(ar.salesReturns.notFound);
      setInvoiceId(match.id);
      setWarehouseId(match.warehouseId);
      setCustomerId(match.customerId);
      const returnable = await window.api.salesReturns.returnableLines(match.id);
      setLines(returnable.map((l2) => ({ ...l2, returnQty: "", damaged: false })));
    } catch (err) {
      setError(err.message);
    }
  }
  function updateLine(sourceLineId, patch) {
    setLines((prev) => prev.map((l2) => l2.sourceLineId === sourceLineId ? { ...l2, ...patch } : l2));
  }
  async function submit() {
    if (!window.api || !invoiceId || !warehouseId) return;
    setError(null);
    const toReturn = lines.filter((l2) => Number(l2.returnQty) > 0);
    if (toReturn.length === 0) return setError(ar.salesReturns.errors.noLines);
    for (const l2 of toReturn) {
      const qty = Number(l2.returnQty);
      if (!Number.isInteger(qty)) return setError(ar.salesReturns.errors.qtyNotWhole);
      const remaining = l2.soldQtyBase - l2.alreadyReturnedQtyBase;
      if (qty > remaining) return setError(ar.salesReturns.errors.qtyExceedsRemaining);
    }
    if (refundMethod === "account" && !customerId) return setError(ar.salesReturns.errors.accountNeedsCustomer);
    try {
      const returnId = await window.api.salesReturns.create({
        sourceInvoiceId: invoiceId,
        warehouseId,
        customerId,
        refundMethod,
        reason: reason.trim() || null,
        lines: toReturn.map((l2) => ({
          itemId: l2.itemId,
          batchId: l2.batchId,
          unitId: l2.unitId,
          qtyInUnit: Number(l2.returnQty),
          qtyBase: Number(l2.returnQty),
          unitPrice: l2.unitPrice,
          sourceLineId: l2.sourceLineId,
          damaged: l2.damaged
        }))
      });
      const created = await window.api.salesReturns.get(returnId);
      showToast(ar.salesReturns.confirmed.replace("{serial}", String(created?.serial ?? returnId)));
      setInvoiceId(null);
      setLines([]);
      setSerial("");
    } catch (err) {
      setError(`${ar.salesReturns.errors.createFailed}: ${err.message}`);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "items", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "items__bar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "field items__search",
          placeholder: ar.salesReturns.invoiceSerial,
          dir: "ltr",
          value: serial,
          onChange: (e) => setSerial(toAsciiDigits(e.target.value)),
          onKeyDown: (e) => e.key === "Enter" && void findInvoice()
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--primary", onClick: () => void findInvoice(), children: ar.salesReturns.load })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
    invoiceId && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "hint", children: ar.salesReturns.quarantineNotice }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "subtable", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.items.fields.nameAr }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.salesReturns.soldQty }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.salesReturns.alreadyReturned }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.salesReturns.returnQty }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.salesReturns.unitPrice }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.salesReturns.damaged })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: lines.map((l2) => {
          const remaining = l2.soldQtyBase - l2.alreadyReturnedQtyBase;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: l2.itemNameAr }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: l2.soldQtyBase }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: l2.alreadyReturnedQtyBase }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "field field--sm",
                dir: "ltr",
                inputMode: "numeric",
                value: l2.returnQty,
                disabled: remaining <= 0,
                onChange: (e) => updateLine(l2.sourceLineId, {
                  // Base units only — no decimal point, matching
                  // the schema's qtyBase: z.number().int().positive().
                  returnQty: toAsciiDigits(e.target.value).replace(/[^\d]/g, "")
                })
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: fromPiastres(l2.unitPrice) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "checkbox",
                checked: l2.damaged,
                onChange: (e) => updateLine(l2.sourceLineId, { damaged: e.target.checked })
              }
            ) })
          ] }, l2.sourceLineId);
        }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2 mt", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.salesReturns.refundMethod }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "field", value: refundMethod, onChange: (e) => setRefundMethod(e.target.value), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "cash", children: ar.salesReturns.cash }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "credit_note", children: ar.salesReturns.creditNote }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "account", disabled: !customerId, children: ar.salesReturns.account })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.salesReturns.reason }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", value: reason, onChange: (e) => setReason(e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "btn-row", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--primary", onClick: () => void submit(), children: ar.salesReturns.confirm }) })
    ] })
  ] });
}
let keySeq$1 = 1;
function SalesReturnGeneralScreen() {
  const [warehouseId, setWarehouseId] = reactExports.useState(null);
  const [query, setQuery] = reactExports.useState("");
  const [results, setResults] = reactExports.useState([]);
  const [lines, setLines] = reactExports.useState([]);
  const [refundMethod, setRefundMethod] = reactExports.useState("cash");
  const [reason, setReason] = reactExports.useState("");
  const [error, setError] = reactExports.useState(null);
  const { showToast } = useToast();
  const debounce = reactExports.useRef();
  reactExports.useEffect(() => {
    if (!window.api) return;
    void window.api.warehouses.list().then((list) => {
      const def = list.find((w2) => w2.isDefault) ?? list[0];
      if (def) setWarehouseId(def.id);
    });
  }, []);
  reactExports.useEffect(() => {
    if (!window.api || !query.trim()) {
      setResults([]);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      void window.api.items.search(query, 10).then(setResults);
    }, 120);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);
  async function addItem(item) {
    if (!window.api || !warehouseId) return;
    const [detail, batches] = await Promise.all([
      window.api.items.get(item.id),
      window.api.stock.batches(item.id)
    ]);
    const relevant = batches.filter((b) => b.warehouseId === warehouseId && !b.isQuarantined).map((b) => ({ id: b.id, qtyOnHand: b.qtyOnHand, expiryDate: b.expiryDate }));
    const unit = detail?.units.find((u2) => u2.isDefaultSale) ?? detail?.units[0];
    setLines((prev) => [
      ...prev,
      {
        key: keySeq$1++,
        item,
        unitId: unit?.id ?? null,
        batchId: relevant[0]?.id ?? null,
        batches: relevant,
        qty: "",
        unitPrice: item.publicPrice,
        publicPrice: item.publicPrice,
        damaged: false
      }
    ]);
    setQuery("");
    setResults([]);
  }
  function updateLine(key, patch) {
    setLines((prev) => prev.map((l2) => l2.key === key ? { ...l2, ...patch } : l2));
  }
  async function submit() {
    if (!window.api || !warehouseId) return;
    setError(null);
    const valid = lines.filter((l2) => l2.batchId && l2.unitId && Number(l2.qty) > 0 && l2.unitPrice !== null);
    if (valid.length === 0) return setError(ar.salesReturns.errors.noLines);
    if (lines.some((l2) => !l2.batchId)) return setError(ar.salesReturns.errors.noBatch);
    if (valid.some((l2) => !Number.isInteger(Number(l2.qty)))) return setError(ar.salesReturns.errors.qtyNotWhole);
    if (valid.some((l2) => (l2.unitPrice ?? 0) < 0)) return setError(ar.salesReturns.errors.negativePrice);
    const overPriced = valid.find((l2) => l2.publicPrice != null && (l2.unitPrice ?? 0) > l2.publicPrice);
    if (overPriced) return setError(ar.salesReturns.errors.priceAbovePublic);
    try {
      const returnId = await window.api.salesReturns.create({
        warehouseId,
        // A single logged-in owner user stands in for the approving
        // pharmacist until M10 (users/roles) exists — see the system user
        // seeded in migration 0002.
        approvedBy: 1,
        refundMethod,
        reason: reason.trim() || null,
        lines: valid.map((l2) => ({
          itemId: l2.item.id,
          batchId: l2.batchId,
          unitId: l2.unitId,
          qtyInUnit: Number(l2.qty),
          qtyBase: Number(l2.qty),
          unitPrice: l2.unitPrice,
          damaged: l2.damaged
        }))
      });
      const created = await window.api.salesReturns.get(returnId);
      showToast(ar.salesReturns.confirmed.replace("{serial}", String(created?.serial ?? returnId)));
      setLines([]);
    } catch (err) {
      setError(`${ar.salesReturns.errors.createFailed}: ${err.message}`);
    }
  }
  const total = lines.reduce((s, l2) => s + Number(l2.qty || 0) * (l2.unitPrice ?? 0), 0);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "items", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "hint", children: ar.salesReturns.priceCapNotice }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "items__bar field-wrap", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "field items__search",
          placeholder: ar.salesReturns.itemSearch,
          value: query,
          onChange: (e) => setQuery(e.target.value)
        }
      ),
      results.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "autocomplete autocomplete--offset", children: results.map((it) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => void addItem(it), children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: it.nameAr }) }) }, it.id)) })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
    lines.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "subtable", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.items.fields.nameAr }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.salesReturns.batch }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.salesReturns.returnQty }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.salesReturns.unitPrice }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.salesReturns.damaged }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: lines.map((l2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: l2.item.nameAr }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: l2.batches.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "muted small", children: ar.salesReturns.noBatch }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          "select",
          {
            className: "field field--sm",
            value: l2.batchId ?? "",
            onChange: (e) => updateLine(l2.key, { batchId: Number(e.target.value) }),
            children: l2.batches.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: b.id, children: [
              b.expiryDate ?? "—",
              " (",
              b.qtyOnHand,
              ")"
            ] }, b.id))
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            className: "field field--sm",
            dir: "ltr",
            inputMode: "numeric",
            value: l2.qty,
            onChange: (e) => updateLine(l2.key, { qty: toAsciiDigits(e.target.value).replace(/[^\d]/g, "") })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(MoneyInput, { value: l2.unitPrice, onChange: (v2) => updateLine(l2.key, { unitPrice: v2 }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: l2.damaged, onChange: (e) => updateLine(l2.key, { damaged: e.target.checked }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--danger btn--sm", onClick: () => setLines((prev) => prev.filter((x2) => x2.key !== l2.key)), children: ar.purchases.grid.remove }) })
      ] }, l2.key)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2 mt", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.salesReturns.refundMethod }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "field", value: refundMethod, onChange: (e) => setRefundMethod(e.target.value), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "cash", children: ar.salesReturns.cash }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "credit_note", children: ar.salesReturns.creditNote })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.salesReturns.reason }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", value: reason, onChange: (e) => setReason(e.target.value) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "hint", children: ar.salesReturns.approvalRequired }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "stats mb", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.salesReturns.total, value: fromPiastres(total), good: true }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "btn-row", style: { marginBlockStart: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--primary", onClick: () => void submit(), disabled: lines.length === 0, children: ar.salesReturns.confirm }) })
  ] });
}
function PurchaseReturnByInvoiceScreen() {
  const [serial, setSerial] = reactExports.useState("");
  const [invoiceId, setInvoiceId] = reactExports.useState(null);
  const [supplierId, setSupplierId] = reactExports.useState(null);
  const [warehouseId, setWarehouseId] = reactExports.useState(null);
  const [lines, setLines] = reactExports.useState([]);
  const [reason, setReason] = reactExports.useState("");
  const [error, setError] = reactExports.useState(null);
  const { showToast } = useToast();
  async function findInvoice() {
    if (!window.api || !serial.trim()) return;
    setError(null);
    try {
      const serialNum = Number(serial.trim());
      const match = Number.isInteger(serialNum) ? await window.api.purchases.getBySerial(serialNum) : null;
      if (!match) return setError(ar.salesReturns.notFound);
      setInvoiceId(match.id);
      setSupplierId(match.supplierId);
      setWarehouseId(match.warehouseId);
      const returnable = await window.api.purchaseReturns.returnableLines(match.id);
      setLines(returnable.map((l2) => ({ ...l2, returnQty: "" })));
    } catch (err) {
      setError(err.message);
    }
  }
  function updateLine(batchId, patch) {
    setLines((prev) => prev.map((l2) => l2.batchId === batchId ? { ...l2, ...patch } : l2));
  }
  async function submit() {
    if (!window.api || !supplierId || !warehouseId) return;
    setError(null);
    const toReturn = lines.filter((l2) => Number(l2.returnQty) > 0);
    if (toReturn.length === 0) return setError(ar.purchaseReturns.errors.noLines);
    if (toReturn.some((l2) => !Number.isInteger(Number(l2.returnQty)))) {
      return setError(ar.purchaseReturns.errors.qtyNotWhole);
    }
    if (toReturn.some((l2) => Number(l2.returnQty) > (l2.batchQtyOnHand ?? 0))) {
      return setError(ar.purchaseReturns.errors.qtyExceedsOnHand);
    }
    try {
      const returnId = await window.api.purchaseReturns.create({
        sourceInvoiceId: invoiceId,
        supplierId,
        warehouseId,
        reason: reason.trim() || null,
        lines: toReturn.map((l2) => ({
          itemId: l2.itemId,
          batchId: l2.batchId,
          unitId: l2.unitId,
          qtyInUnit: Number(l2.returnQty),
          qtyBase: Number(l2.returnQty)
        }))
      });
      const created = await window.api.purchaseReturns.get(returnId);
      showToast(ar.purchaseReturns.confirmed.replace("{serial}", String(created?.serial ?? returnId)));
      setInvoiceId(null);
      setLines([]);
      setSerial("");
    } catch (err) {
      setError(`${ar.purchaseReturns.errors.createFailed}: ${err.message}`);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "items", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "items__bar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "field items__search",
          placeholder: ar.purchaseReturns.invoiceSerial,
          dir: "ltr",
          value: serial,
          onChange: (e) => setSerial(toAsciiDigits(e.target.value)),
          onKeyDown: (e) => e.key === "Enter" && void findInvoice()
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--primary", onClick: () => void findInvoice(), children: ar.purchaseReturns.load })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
    invoiceId && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "subtable", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.items.fields.nameAr }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchaseReturns.receivedQty }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchaseReturns.onHandQty }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchaseReturns.alreadyReturned }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchaseReturns.returnQty }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchaseReturns.unitCost })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: lines.map((l2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: l2.itemNameAr }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: l2.receivedQtyBase }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: l2.batchQtyOnHand ?? "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: l2.alreadyReturnedQtyBase }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "field field--sm",
              dir: "ltr",
              inputMode: "numeric",
              value: l2.returnQty,
              disabled: (l2.batchQtyOnHand ?? 0) <= 0,
              onChange: (e) => updateLine(l2.batchId, {
                returnQty: toAsciiDigits(e.target.value).replace(/[^\d]/g, "")
              })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: fromPiastres(l2.unitCost) })
        ] }, l2.batchId)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield formfield--narrow mt", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.purchaseReturns.reason }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", value: reason, onChange: (e) => setReason(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "btn-row", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--primary", onClick: () => void submit(), children: ar.purchaseReturns.confirm }) })
    ] })
  ] });
}
let keySeq = 1;
function PurchaseReturnGeneralScreen() {
  const [warehouseId, setWarehouseId] = reactExports.useState(null);
  const [supplierQuery, setSupplierQuery] = reactExports.useState("");
  const [supplierResults, setSupplierResults] = reactExports.useState([]);
  const [supplier, setSupplier] = reactExports.useState(null);
  const [itemQuery, setItemQuery] = reactExports.useState("");
  const [itemResults, setItemResults] = reactExports.useState([]);
  const [lines, setLines] = reactExports.useState([]);
  const [reason, setReason] = reactExports.useState("");
  const [error, setError] = reactExports.useState(null);
  const { showToast } = useToast();
  const supplierDebounce = reactExports.useRef();
  const itemDebounce = reactExports.useRef();
  reactExports.useEffect(() => {
    if (!window.api) return;
    void window.api.warehouses.list().then((list) => {
      const def = list.find((w2) => w2.isDefault) ?? list[0];
      if (def) setWarehouseId(def.id);
    });
  }, []);
  reactExports.useEffect(() => {
    if (!window.api || !supplierQuery.trim()) {
      setSupplierResults([]);
      return;
    }
    if (supplierDebounce.current) clearTimeout(supplierDebounce.current);
    supplierDebounce.current = setTimeout(() => {
      void window.api.suppliers.search(supplierQuery, 10).then(setSupplierResults);
    }, 120);
    return () => {
      if (supplierDebounce.current) clearTimeout(supplierDebounce.current);
    };
  }, [supplierQuery]);
  reactExports.useEffect(() => {
    if (!window.api || !itemQuery.trim()) {
      setItemResults([]);
      return;
    }
    if (itemDebounce.current) clearTimeout(itemDebounce.current);
    itemDebounce.current = setTimeout(() => {
      void window.api.items.search(itemQuery, 10).then(setItemResults);
    }, 120);
    return () => {
      if (itemDebounce.current) clearTimeout(itemDebounce.current);
    };
  }, [itemQuery]);
  function selectSupplier(s) {
    setSupplier(s);
    setSupplierQuery(s.nameAr);
    setSupplierResults([]);
  }
  async function addItem(item) {
    if (!window.api || !warehouseId) return;
    const [detail, batches] = await Promise.all([
      window.api.items.get(item.id),
      window.api.stock.batches(item.id)
    ]);
    const withStock = batches.filter((b) => b.warehouseId === warehouseId && b.qtyOnHand > 0 && b.isQuarantined === 0).map((b) => ({ id: b.id, qtyOnHand: b.qtyOnHand, batchNumber: b.batchNumber, unitCost: b.unitCost }));
    const unit = detail?.units.find((u2) => u2.isDefaultSale) ?? detail?.units[0];
    setLines((prev) => [
      ...prev,
      { key: keySeq++, item, unitId: unit?.id ?? null, batchId: withStock[0]?.id ?? null, batches: withStock, qty: "" }
    ]);
    setItemQuery("");
    setItemResults([]);
  }
  function updateLine(key, patch) {
    setLines((prev) => prev.map((l2) => l2.key === key ? { ...l2, ...patch } : l2));
  }
  async function submit() {
    if (!window.api || !warehouseId) return;
    setError(null);
    if (!supplier) return setError(ar.purchaseReturns.errors.noSupplier);
    const valid = lines.filter((l2) => l2.batchId && l2.unitId && Number(l2.qty) > 0);
    if (valid.length === 0) return setError(ar.purchaseReturns.errors.noLines);
    if (valid.some((l2) => !Number.isInteger(Number(l2.qty)))) return setError(ar.purchaseReturns.errors.qtyNotWhole);
    const overQty = valid.find((l2) => {
      const batch = l2.batches.find((b) => b.id === l2.batchId);
      return Number(l2.qty) > (batch?.qtyOnHand ?? 0);
    });
    if (overQty) return setError(ar.purchaseReturns.errors.qtyExceedsOnHand);
    try {
      const returnId = await window.api.purchaseReturns.create({
        supplierId: supplier.id,
        warehouseId,
        reason: reason.trim() || null,
        lines: valid.map((l2) => ({
          itemId: l2.item.id,
          batchId: l2.batchId,
          unitId: l2.unitId,
          qtyInUnit: Number(l2.qty),
          qtyBase: Number(l2.qty)
        }))
      });
      const created = await window.api.purchaseReturns.get(returnId);
      showToast(ar.purchaseReturns.confirmed.replace("{serial}", String(created?.serial ?? returnId)));
      setLines([]);
    } catch (err) {
      setError(`${ar.purchaseReturns.errors.createFailed}: ${err.message}`);
    }
  }
  const totalCost = lines.reduce((s, l2) => {
    const batch = l2.batches.find((b) => b.id === l2.batchId);
    return s + Number(l2.qty || 0) * (batch?.unitCost ?? 0);
  }, 0);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "items", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid2 mb", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield field-wrap", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "formfield__label", children: [
        ar.purchaseReturns.supplier,
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "req", children: " *" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "field",
          placeholder: ar.purchaseReturns.supplierSearch,
          value: supplierQuery,
          onChange: (e) => {
            setSupplierQuery(e.target.value);
            setSupplier(null);
          }
        }
      ),
      supplierResults.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "autocomplete", children: supplierResults.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => selectSupplier(s), children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: s.nameAr }) }) }, s.id)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "items__bar field-wrap", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "field items__search",
          placeholder: ar.purchaseReturns.itemSearch,
          value: itemQuery,
          onChange: (e) => setItemQuery(e.target.value)
        }
      ),
      itemResults.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "autocomplete autocomplete--offset", children: itemResults.map((it) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => void addItem(it), children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: it.nameAr }) }) }, it.id)) })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
    lines.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "subtable", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.items.fields.nameAr }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchaseReturns.batch }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchaseReturns.onHandQty }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchaseReturns.returnQty }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: lines.map((l2) => {
        const batch = l2.batches.find((b) => b.id === l2.batchId);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: l2.item.nameAr }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "select",
            {
              className: "field",
              value: l2.batchId ?? "",
              onChange: (e) => updateLine(l2.key, { batchId: Number(e.target.value) }),
              children: l2.batches.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: b.id, children: b.batchNumber ?? `#${b.id}` }, b.id))
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: batch?.qtyOnHand ?? 0 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "field field--sm",
              dir: "ltr",
              inputMode: "numeric",
              value: l2.qty,
              onChange: (e) => updateLine(l2.key, { qty: toAsciiDigits(e.target.value).replace(/[^\d]/g, "") })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--danger btn--sm", onClick: () => setLines((prev) => prev.filter((x2) => x2.key !== l2.key)), children: ar.purchases.grid.remove }) })
        ] }, l2.key);
      }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield formfield--narrow mt", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.purchaseReturns.reason }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", value: reason, onChange: (e) => setReason(e.target.value) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "stats my", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.purchaseReturns.total, value: fromPiastres(totalCost), good: true }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "btn-row", style: { marginBlockStart: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--primary", onClick: () => void submit(), disabled: lines.length === 0, children: ar.purchaseReturns.confirm }) })
  ] });
}
const CATEGORIES = [
  { value: "petty_cash", label: ar.cashInOut.categories.pettyCash },
  { value: "safe_transfer", label: ar.cashInOut.categories.safeTransfer },
  { value: "safe_topup", label: ar.cashInOut.categories.safeTopup },
  { value: "refund", label: ar.cashInOut.categories.refund },
  { value: "other", label: ar.cashInOut.categories.other }
];
function CashInOutScreen() {
  const [shift, setShift] = reactExports.useState(null);
  const [warehouseName, setWarehouseName] = reactExports.useState("");
  const [expectedCash, setExpectedCash] = reactExports.useState(null);
  const [transactions, setTransactions] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const { showToast } = useToast();
  const [direction, setDirection] = reactExports.useState("out");
  const [amount, setAmount] = reactExports.useState(null);
  const [category, setCategory] = reactExports.useState(CATEGORIES[0].value);
  const [note, setNote] = reactExports.useState("");
  async function load() {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const warehouses = await window.api.warehouses.list();
      const def = warehouses.find((w2) => w2.isDefault) ?? warehouses[0];
      if (!def) return;
      setWarehouseName(def.nameAr);
      const open = await window.api.shifts.getOpen(def.id);
      setShift(open);
      if (open) {
        const [expected, tx] = await Promise.all([
          window.api.shifts.computeExpectedCash(open.id),
          window.api.shifts.cashTransactions(open.id)
        ]);
        setExpectedCash(expected);
        setTransactions(tx);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    void load();
  }, []);
  async function submit() {
    if (!window.api || !shift) return;
    setError(null);
    if (amount === null || amount <= 0) return setError(ar.cashInOut.errors.invalidAmount);
    try {
      await window.api.shifts.recordCash(shift.id, direction, amount, category, note.trim() || null);
      showToast(direction === "in" ? ar.cashInOut.cashIn : ar.cashInOut.cashOut);
      setAmount(null);
      setNote("");
      await load();
    } catch (err) {
      const message = err.message;
      setError(
        /is closed \(rule 9\/BR-10\)/.test(message) ? ar.cashInOut.errors.shiftClosed : `${ar.cashInOut.errors.submitFailed}: ${message}`
      );
    }
  }
  if (loading) return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: ar.items.loading });
  if (!shift) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stack", children: [
      error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: ar.cashInOut.noOpenShift })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stack", children: [
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "panel", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stats", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.cashInOut.warehouse, value: warehouseName, neutral: true }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.cashInOut.expectedCash, value: fromPiastres(expectedCash ?? 0), good: true })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "fieldset", style: { marginBlockStart: 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { children: ar.cashInOut.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.cashInOut.direction }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "field", value: direction, onChange: (e) => setDirection(e.target.value), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "out", children: ar.cashInOut.cashOut }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "in", children: ar.cashInOut.cashIn })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.cashInOut.amount }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MoneyInput, { value: amount, onChange: setAmount })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.cashInOut.category }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: "field", value: category, onChange: (e) => setCategory(e.target.value), children: CATEGORIES.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c.value, children: c.label }, c.value)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.cashInOut.note }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", value: note, onChange: (e) => setNote(e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "btn-row", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--primary", onClick: () => void submit(), children: ar.cashInOut.submit }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "section-heading", children: ar.cashInOut.history }),
      transactions.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { title: ar.cashInOut.empty }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "datatable", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.purchases.invoiceDate }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.cashInOut.direction }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.cashInOut.amount }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.cashInOut.category }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.cashInOut.note })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: transactions.map((t2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: t2.at.slice(0, 16) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: t2.direction === "in" ? ar.cashInOut.cashIn : ar.cashInOut.cashOut }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: fromPiastres(t2.amount) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: t2.category ?? "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: t2.note ?? "—" })
        ] }, t2.id)) })
      ] })
    ] })
  ] });
}
function SettingsScreen() {
  const [settings, setSettings] = reactExports.useState(null);
  const [d30, setD30] = reactExports.useState("");
  const [d60, setD60] = reactExports.useState("");
  const [d90, setD90] = reactExports.useState("");
  const [d180, setD180] = reactExports.useState("");
  const [returnWindowDays, setReturnWindowDays] = reactExports.useState("");
  const [scanner, setScanner] = reactExports.useState(() => loadScannerConfig());
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const { showToast } = useToast();
  const [saving, setSaving] = reactExports.useState(false);
  const [testState, setTestState] = reactExports.useState("idle");
  const [testCode, setTestCode] = reactExports.useState(null);
  const [testProblems, setTestProblems] = reactExports.useState([]);
  async function load() {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const s = await window.api.settings.get();
      setSettings(s);
      setD30(String(s.expiryBucketDays.d30));
      setD60(String(s.expiryBucketDays.d60));
      setD90(String(s.expiryBucketDays.d90));
      setD180(String(s.expiryBucketDays.d180));
      setReturnWindowDays(String(s.salesReturnWindowDays));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    void load();
  }, []);
  async function save() {
    if (!window.api) return;
    setError(null);
    const bucketDays = {
      d30: Number(d30),
      d60: Number(d60),
      d90: Number(d90),
      d180: Number(d180)
    };
    if (!(bucketDays.d30 > 0 && bucketDays.d30 < bucketDays.d60 && bucketDays.d60 < bucketDays.d90 && bucketDays.d90 < bucketDays.d180)) {
      setError(ar.settings.expiryOrderError);
      return;
    }
    const windowDays = Number(returnWindowDays);
    if (!(Number.isInteger(windowDays) && windowDays > 0)) {
      setError(ar.settings.returnWindowError);
      return;
    }
    if (scanner.minLength > scanner.maxLength) {
      setError(ar.settings.scannerLengthOrderError);
      return;
    }
    if (scanner.minLength <= 0 || scanner.maxLength <= 0 || scanner.maxIntervalMs <= 0 || scanner.debounceMs <= 0) {
      setError(ar.settings.scannerPositiveError);
      return;
    }
    setSaving(true);
    try {
      const updated = await window.api.settings.update({
        expiryBucketDays: bucketDays,
        salesReturnWindowDays: windowDays
      });
      setSettings(updated);
      saveScannerConfig(scanner);
      showToast(ar.settings.saved);
    } catch (err) {
      setError(`${ar.settings.saveFailed}: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }
  function resetScanner() {
    setScanner(INSTALLED_SCANNER_CONFIG);
  }
  function testScanner() {
    setTestState("waiting");
    setTestCode(null);
    setTestProblems([]);
    const handle = createScanner(() => {
    }, { config: scanner });
    void handle.selfTest(15e3).then((result) => {
      handle.detach();
      setTestCode(result.code ?? null);
      setTestProblems(result.problems);
      setTestState(result.ok ? "ok" : "failed");
    });
  }
  if (loading) return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: ar.items.loading });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stack", children: [
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "fieldset", style: { marginBlockStart: 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { children: ar.settings.expirySection }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "hint", children: ar.settings.expiryHint }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.settings.expiryD30 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "field field--sm",
              dir: "ltr",
              inputMode: "numeric",
              value: d30,
              onChange: (e) => setD30(toAsciiDigits(e.target.value))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.settings.expiryD60 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "field field--sm",
              dir: "ltr",
              inputMode: "numeric",
              value: d60,
              onChange: (e) => setD60(toAsciiDigits(e.target.value))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.settings.expiryD90 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "field field--sm",
              dir: "ltr",
              inputMode: "numeric",
              value: d90,
              onChange: (e) => setD90(toAsciiDigits(e.target.value))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.settings.expiryD180 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "field field--sm",
              dir: "ltr",
              inputMode: "numeric",
              value: d180,
              onChange: (e) => setD180(toAsciiDigits(e.target.value))
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "fieldset", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { children: ar.settings.returnsSection }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.settings.returnWindowDays }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            className: "field field--sm",
            dir: "ltr",
            inputMode: "numeric",
            value: returnWindowDays,
            onChange: (e) => setReturnWindowDays(toAsciiDigits(e.target.value))
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "hint", children: ar.settings.returnWindowHint })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "fieldset", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { children: ar.settings.scannerSection }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "hint", children: ar.settings.scannerHint }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.settings.scannerTerminator }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "field",
              value: scanner.terminator,
              onChange: (e) => setScanner((s) => ({ ...s, terminator: e.target.value })),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Enter", children: ar.settings.scannerTerminatorEnter }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Tab", children: ar.settings.scannerTerminatorTab }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "None", children: ar.settings.scannerTerminatorNone })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.settings.scannerMinLength }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "field field--sm",
              dir: "ltr",
              inputMode: "numeric",
              value: scanner.minLength,
              onChange: (e) => setScanner((s) => ({ ...s, minLength: Number(toAsciiDigits(e.target.value)) || 0 }))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.settings.scannerMaxLength }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "field field--sm",
              dir: "ltr",
              inputMode: "numeric",
              value: scanner.maxLength,
              onChange: (e) => setScanner((s) => ({ ...s, maxLength: Number(toAsciiDigits(e.target.value)) || 0 }))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.settings.scannerMaxIntervalMs }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "field field--sm",
              dir: "ltr",
              inputMode: "numeric",
              value: scanner.maxIntervalMs,
              onChange: (e) => setScanner((s) => ({ ...s, maxIntervalMs: Number(toAsciiDigits(e.target.value)) || 0 }))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.settings.scannerDebounceMs }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "field field--sm",
              dir: "ltr",
              inputMode: "numeric",
              value: scanner.debounceMs,
              onChange: (e) => setScanner((s) => ({ ...s, debounceMs: Number(toAsciiDigits(e.target.value)) || 0 }))
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "btn-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--sm", onClick: testScanner, disabled: testState === "waiting", children: ar.settings.scannerTest }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--sm", onClick: resetScanner, children: ar.settings.scannerReset })
      ] }),
      testState === "waiting" && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "hint", children: ar.settings.scannerTestWaiting }),
      testState === "ok" && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "hint", children: [
        ar.settings.scannerTestOk,
        testCode && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          " — ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { dir: "ltr", children: testCode })
        ] })
      ] }),
      testState === "failed" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: testCode ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { dir: "ltr", children: testCode }),
        testProblems.length > 0 && " — " + testProblems.join("؛ ")
      ] }) : ar.settings.scannerTestFailed })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "btn-row", style: { marginBlockStart: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--primary", onClick: () => void save(), disabled: saving, children: ar.settings.save }) })
  ] });
}
function todayIso$1() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function daysAgoIso(days) {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
function SalesReportScreen() {
  const [from, setFrom] = reactExports.useState(todayIso$1());
  const [to, setTo] = reactExports.useState(todayIso$1());
  const [report, setReport] = reactExports.useState(null);
  const [invoices, setInvoices] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  async function load() {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    if (from > to) {
      setError(ar.salesReport.errors.invalidRange);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [summary, list] = await Promise.all([
        window.api.salesReport.summary(from, to),
        window.api.salesReport.invoices(from, to)
      ]);
      setReport(summary);
      setInvoices(list);
    } catch (err) {
      setError(`${ar.salesReport.errors.loadFailed}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    void load();
  }, []);
  function applyPreset(days) {
    setFrom(daysAgoIso(days));
    setTo(todayIso$1());
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stack", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.salesReport.fromDate }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", type: "date", dir: "ltr", value: from, onChange: (e) => setFrom(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.salesReport.toDate }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "field", type: "date", dir: "ltr", value: to, onChange: (e) => setTo(e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "btn-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--sm", onClick: () => applyPreset(0), children: ar.salesReport.today }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--sm", onClick: () => applyPreset(7), children: ar.salesReport.thisWeek }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--sm", onClick: () => applyPreset(30), children: ar.salesReport.thisMonth }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--primary btn--sm", onClick: () => void load(), children: ar.salesReport.apply })
      ] })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableSkeleton, { cols: 5 }) : report ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stats", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.salesReport.invoiceCount, value: String(report.invoiceCount), neutral: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.salesReport.cashTotal, value: fromPiastres(report.cashTotal) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.salesReport.creditTotal, value: fromPiastres(report.creditTotal) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.salesReport.grandTotal, value: fromPiastres(report.grandTotal), good: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: ar.salesReport.grossProfit, value: fromPiastres(report.grossProfit), good: true })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "section-heading", children: ar.salesReport.invoiceList }),
        invoices.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { title: ar.salesReport.empty }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "datatable", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.salesReport.serial }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.salesReport.type }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.salesReport.total }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.salesReport.profit }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.salesReport.confirmedAt })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: invoices.map((inv) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: inv.serial }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: inv.invoiceType === "cash" ? ar.salesReport.cash : ar.salesReport.credit }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: fromPiastres(inv.total) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: fromPiastres(inv.total - inv.costTotal) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: inv.confirmedAt?.slice(0, 16) ?? "—" })
          ] }, inv.id)) })
        ] })
      ] })
    ] }) : null
  ] });
}
function bucketBadgeClass(bucket) {
  if (bucket === "expired") return "badge badge--error";
  if (bucket === "d30") return "badge badge--warning";
  if (bucket === "d60") return "badge badge--info";
  return "badge badge--muted";
}
const BUCKETS = ["expired", "d30", "d60", "d90", "d180", "over180"];
const fill = (template, vars) => Object.entries(vars).reduce((s, [k2, v2]) => s.replace(`{${k2}}`, String(v2)), template);
function bucketLabels(bucketDays) {
  return {
    expired: ar.expiryReport.bucketExpired,
    d30: fill(ar.expiryReport.bucketWithin, { days: bucketDays.d30 }),
    d60: fill(ar.expiryReport.bucketBetween, { from: bucketDays.d30 + 1, to: bucketDays.d60 }),
    d90: fill(ar.expiryReport.bucketBetween, { from: bucketDays.d60 + 1, to: bucketDays.d90 }),
    d180: fill(ar.expiryReport.bucketBetween, { from: bucketDays.d90 + 1, to: bucketDays.d180 }),
    over180: fill(ar.expiryReport.bucketOver, { days: bucketDays.d180 })
  };
}
function todayIso() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function ExpiryReportScreen() {
  const [asOf, setAsOf] = reactExports.useState(todayIso());
  const [report, setReport] = reactExports.useState(null);
  const [bucketFilter, setBucketFilter] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  async function load() {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setReport(await window.api.stock.expiryReport(asOf));
    } catch (err) {
      setError(`${ar.expiryReport.errors.loadFailed}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    void load();
  }, []);
  const rows = report ? bucketFilter ? report.rows.filter((r2) => r2.bucket === bucketFilter) : report.rows : [];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stack", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "formfield", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "formfield__label", children: ar.expiryReport.asOf }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            className: "field field--date",
            type: "date",
            dir: "ltr",
            value: asOf,
            onChange: (e) => setAsOf(e.target.value)
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "btn-row", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn--primary btn--sm", onClick: () => void load(), children: ar.expiryReport.apply }) })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert--error", children: error }),
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableSkeleton, { cols: 8 }) : report ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stats", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: `stat-btn${bucketFilter === null ? " stat-btn--active" : ""}`,
            onClick: () => setBucketFilter(null),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Stat,
              {
                label: ar.expiryReport.allBuckets,
                value: String(report.summary.reduce((s, b) => s + b.batchCount, 0)),
                neutral: true
              }
            )
          }
        ),
        BUCKETS.map((bucket) => {
          const s = report.summary.find((x2) => x2.bucket === bucket);
          const labels = bucketLabels(report.bucketDays);
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: `stat-btn${bucketFilter === bucket ? " stat-btn--active" : ""}`,
              onClick: () => setBucketFilter(bucket),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Stat,
                {
                  label: labels[bucket],
                  value: `${s.batchCount} / ${fromPiastres(s.value)}`,
                  good: bucket === "over180" || bucket === "d180",
                  bad: bucket === "expired"
                }
              )
            },
            bucket
          );
        })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "section-heading", children: ar.expiryReport.tableTitle }),
        rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { title: ar.expiryReport.empty }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "datatable", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.expiryReport.code }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.expiryReport.itemName }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.expiryReport.batchNumber }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.expiryReport.expiryDate }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", {}),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.expiryReport.qtyOnHand }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.expiryReport.unitCost }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: ar.expiryReport.value })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: rows.map((r2) => {
            const labels = bucketLabels(report.bucketDays);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: r2.code }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r2.nameAr }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: r2.batchNumber ?? "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: r2.expiryDate }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: bucketBadgeClass(r2.bucket), children: labels[r2.bucket] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: r2.qtyOnHand }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: fromPiastres(r2.unitCost) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { dir: "ltr", children: fromPiastres(r2.value) })
            ] }, r2.batchId);
          }) })
        ] })
      ] })
    ] }) : null
  ] });
}
const DRAWER_KEY = "ui.drawerOpen";
function readFlag(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === "true";
  } catch {
    return fallback;
  }
}
const SHOW_FORM_SHORTCUT_BADGES = true;
function App() {
  const [screen, setScreen] = reactExports.useState("dashboard");
  const [drawerOpen, setDrawerOpen] = reactExports.useState(() => readFlag(DRAWER_KEY, true));
  const [pendingQuery, setPendingQuery] = reactExports.useState("");
  function navigate(target) {
    setPendingQuery("");
    setScreen(target);
  }
  function navigateWithQuery(target, query) {
    setPendingQuery(query);
    setScreen(target);
  }
  reactExports.useEffect(() => {
    try {
      localStorage.setItem(DRAWER_KEY, String(drawerOpen));
    } catch {
    }
  }, [drawerOpen]);
  const bindings = reactExports.useMemo(
    () => MODULES.map((m2) => ({
      id: m2.id,
      ...m2.shortcut,
      run: () => navigate(m2.target)
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  reactExports.useEffect(() => attachShortcuts(bindings), [bindings]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ToastProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "shell", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Toolbar,
      {
        activeScreen: screen,
        onNavigate: navigate,
        onToggleDrawer: () => setDrawerOpen((v2) => !v2),
        onSearchNavigate: navigateWithQuery
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "shell__body", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Drawer, { open: drawerOpen, activeScreen: screen, onNavigate: navigate }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "shell__content", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "shell__heading", children: SCREEN_LABELS[screen] }),
        screen === "dashboard" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Dashboard, { onNavigate: navigate }) : screen === "health" ? /* @__PURE__ */ jsxRuntimeExports.jsx(HealthCheck, {}) : screen === "items.list" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ItemsScreen, { showBadges: SHOW_FORM_SHORTCUT_BADGES, initialQuery: pendingQuery }) : screen === "warehouses" ? /* @__PURE__ */ jsxRuntimeExports.jsx(WarehousesScreen, {}) : screen === "suppliers.list" ? /* @__PURE__ */ jsxRuntimeExports.jsx(SuppliersScreen, {}) : screen === "purchases.invoices" ? /* @__PURE__ */ jsxRuntimeExports.jsx(PurchasesScreen, {}) : screen === "items.stock" ? /* @__PURE__ */ jsxRuntimeExports.jsx(StockScreen, {}) : screen === "sales.invoices" ? /* @__PURE__ */ jsxRuntimeExports.jsx(SalesScreen, {}) : screen === "sales.shiftHandover" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ShiftHandoverScreen, {}) : screen === "customers.list" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CustomersScreen, { initialQuery: pendingQuery }) : screen === "customers.reports" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CustomerReportsScreen, {}) : screen === "sales.returnByInvoice" ? /* @__PURE__ */ jsxRuntimeExports.jsx(SalesReturnByInvoiceScreen, {}) : screen === "sales.returnGeneral" ? /* @__PURE__ */ jsxRuntimeExports.jsx(SalesReturnGeneralScreen, {}) : screen === "purchases.returnByInvoice" ? /* @__PURE__ */ jsxRuntimeExports.jsx(PurchaseReturnByInvoiceScreen, {}) : screen === "purchases.returnGeneral" ? /* @__PURE__ */ jsxRuntimeExports.jsx(PurchaseReturnGeneralScreen, {}) : screen === "accounts.cashInOut" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CashInOutScreen, {}) : screen === "sales.reports" ? /* @__PURE__ */ jsxRuntimeExports.jsx(SalesReportScreen, {}) : screen === "items.expiry" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ExpiryReportScreen, {}) : screen === "settings.general" ? /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsScreen, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(Placeholder, { screen })
      ] }, screen)
    ] })
  ] }) });
}
client.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) })
);
