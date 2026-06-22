const blockSuperAdminInstitutionAccess = (req, res, next) => {
  if (req.user?.role === 'super_admin') {
    if (req.institutionId && req.institutionId !== 'platform') {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Select a school scope before accessing institution data.',
    });
  }

  return next();
};

module.exports = {
  blockSuperAdminInstitutionAccess,
};
