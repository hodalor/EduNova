const namespaces = {
  io: null,
  notifications: null,
  transport: null,
};

const setSocketNamespaces = (payload) => {
  Object.assign(namespaces, payload);
};

const getSocketNamespaces = () => namespaces;

module.exports = {
  setSocketNamespaces,
  getSocketNamespaces,
};
