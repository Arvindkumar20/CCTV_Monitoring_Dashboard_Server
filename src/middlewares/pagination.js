// middleware/pagination.js
const paginate = (model, options = {}) => {
  return async (req, res, next) => {
    try {
      // Get pagination parameters from query string
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      // Get filter/sort from query
      const filter = req.query.filter ? JSON.parse(req.query.filter) : {};
      const sort = req.query.sort ? JSON.parse(req.query.sort) : { createdAt: -1 };
      
      // Build query
      const query = model.find(filter);
      
      // Apply pagination
      const totalItems = await model.countDocuments(filter);
      const data = await query
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(); // Returns plain JS objects
      
      // Calculate pagination metadata
      const totalPages = Math.ceil(totalItems / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;
      
      // Create pagination object
      const pagination = {
        page,
        limit,
        totalItems,
        totalPages,
        hasNext,
        hasPrev,
        nextPage: hasNext ? page + 1 : null,
        prevPage: hasPrev ? page - 1 : null
      };
      
      // Attach to response
      res.paginatedResults = {
        success: true,
        count: data.length,
        data,
        pagination
      };
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default paginate;