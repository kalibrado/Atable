const asyncHandler = (fn) => (req, res, next) => {
  const ret = Promise.resolve(fn(req, res, next)).catch(next);
  
  // Gestion d'erreur globale au cas où next() ne capture rien
  if (ret && typeof ret.catch === 'function') {
    ret.catch((error) => {
      if (!res.headersSent) {
        logger.error('Erreur non capturée:', error);
        res.status(500).json({ error: 'Erreur serveur interne' });
      }
    });
  }
};

module.exports = {
  asyncHandler
};