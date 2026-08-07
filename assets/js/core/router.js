/* ============================================================
   router.js — توجيه بسيط بالـhash يعمل من file:// بلا سيرفر
   نمط المسار: #/loans  أو  #/loan/loan_abc
   ============================================================ */

(function (App) {
  'use strict';

  var R = {
    routes: [],
    current: { path: '/', params: {} },
    onRender: null,

    /** تسجيل مسار: R.add('/loan/:id', view) */
    add: function (pattern, view) {
      var keys = [];
      var regex = new RegExp('^' + pattern.replace(/:[^/]+/g, function (m) {
        keys.push(m.slice(1));
        return '([^/]+)';
      }) + '$');
      this.routes.push({ pattern: pattern, regex: regex, keys: keys, view: view });
      return this;
    },

    path: function () {
      var h = location.hash.replace(/^#/, '');
      if (!h || h === '/') return '/';
      return h.replace(/\/+$/, '') || '/';
    },

    match: function (path) {
      for (var i = 0; i < this.routes.length; i++) {
        var r = this.routes[i];
        var m = path.match(r.regex);
        if (m) {
          var params = {};
          r.keys.forEach(function (k, idx) { params[k] = decodeURIComponent(m[idx + 1]); });
          return { route: r, params: params };
        }
      }
      return null;
    },

    go: function (path, replace) {
      var target = '#' + path;
      if (location.hash === target) { this.render(); return; }
      if (replace) location.replace(target);
      else location.hash = path;
    },

    back: function () {
      if (history.length > 1) history.back();
      else this.go('/');
    },

    render: function () {
      var path = this.path();
      var found = this.match(path);
      if (!found) { this.go('/', true); return; }
      this.current = { path: path, params: found.params };
      if (this.onRender) this.onRender(found.route.view, found.params, path);
    },

    start: function () {
      var self = this;
      window.addEventListener('hashchange', function () { self.render(); });
      this.render();
    }
  };

  App.router = R;
})(window.App);
