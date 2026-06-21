const blockSuperAdminInstitutionAccess = (req, res, next) => {
  if (req.user?.role === 'super_admin') {
    return res.status(403).json({
      success: false,
      message:
        'Super admins can only access aggregate platform endpoints. Institution data is not directly available.',
    });
  }

  return next();
};

module.exports = {
  blockSuperAdminInstitutionAccess,
};
