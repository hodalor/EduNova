const usersService = require('./users.service');

const wrap = (handler) => async (req, res) =>
  res.json({
    success: true,
    data: await handler(req),
  });

module.exports = {
  listUsers: wrap((req) =>
    usersService.listUsers({
      institutionId: req.institutionId,
      role: req.query.role,
    })
  ),
  createUser: async (req, res) => {
    const data = await usersService.createUser({
      institutionId: req.institutionId,
      payload: req.body,
      actorId: req.user.id,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      data,
    });
  },
};
