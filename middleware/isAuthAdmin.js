
// Middleware to check if the user is authenticated

const isAuthenticatedAdmin = (req, res, next) => {
    if (req.session && req.session.adminid) {
        next();
    } else {
        res.status(403).send('Not authenticated as a admin');
    }
};
  
  module.exports = isAuthenticatedAdmin;
  
