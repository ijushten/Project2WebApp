export function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/signin");
  }

  next();
}

export function redirectIfLoggedIn(req, res, next) {
  if (req.session.userId) {
    return res.redirect("/dashboard");
  }

  next();
}
