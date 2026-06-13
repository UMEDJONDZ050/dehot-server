const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Ин маълумот аллакай мавҷуд аст',
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Маълумот ёфт нашуд',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Хатои сервер',
  });
};

module.exports = errorHandler;
