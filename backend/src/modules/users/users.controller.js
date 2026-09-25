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
  updateUser: async (req, res) => {
    const data = await usersService.updateUser({
      institutionId: req.institutionId,
      userId: req.params.id,
      payload: req.body,
      actorId: req.user.id,
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      data,
    });
  },
  updateUserAccess: async (req, res) => {
    const data = await usersService.updateUserAccess({
      institutionId: req.institutionId,
      userId: req.params.id,
      payload: req.body,
      actorId: req.user.id,
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      data,
    });
  },
  deleteUser: async (req, res) => {
    const data = await usersService.deleteUser({
      institutionId: req.institutionId,
      userId: req.params.id,
      actorId: req.user.id,
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      data,
    });
  },
  searchParents: wrap((req) =>
    usersService.searchParents({
      institutionId: req.institutionId,
      search: req.query.search,
      limit: Number(req.query.limit) || 20,
    })
  ),
};
