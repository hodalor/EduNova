const scanBuffer = async (_buffer) => {
  return {
    clean: true,
    provider: 'mock-scanner',
  };
};

module.exports = {
  scanBuffer,
};
