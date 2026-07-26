// services/paginationService.js
class PaginationService {
  static async paginate({
    model,
    query = {},
    page = 1,
    limit = 10,
    sort = { createdAt: -1 },
    populate = [],
    select = '',
    searchFields = [],
    searchTerm = '',
    customFilter = {}
  }) {
    
    // Calculate skip
    const skip = (page - 1) * limit;
    
    // Build filter
    let filter = { ...query, ...customFilter };
    
    // Add search if provided
    if (searchTerm && searchFields.length > 0) {
      const searchRegex = new RegExp(searchTerm, 'i');
      const searchConditions = searchFields.map(field => ({
        [field]: { $regex: searchRegex }
      }));
      filter = { ...filter, $or: searchConditions };
    }
    
    // Build query
    let mongooseQuery = model.find(filter);
    
    // Apply sorting
    mongooseQuery = mongooseQuery.sort(sort);
    
    // Apply field selection
    if (select) {
      mongooseQuery = mongooseQuery.select(select);
    }
    
    // Apply population
    populate.forEach(pop => {
      if (typeof pop === 'string') {
        mongooseQuery = mongooseQuery.populate(pop);
      } else {
        mongooseQuery = mongooseQuery.populate(pop.path, pop.select);
      }
    });
    
    // Clone query for counting
    const countQuery = model.countDocuments(filter);
    
    // Execute queries in parallel
    const [totalItems, data] = await Promise.all([
      countQuery,
      mongooseQuery.skip(skip).limit(limit).lean()
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalItems / limit);
    
    return {
      data,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null
      }
    };
  }
  
  // Cursor-based pagination
  static async cursorPaginate({
    model,
    cursorField = '_id',
    cursor = null,
    limit = 10,
    direction = 'next', // 'next' or 'prev'
    sort = { [cursorField]: 1 },
    filter = {},
    populate = []
  }) {
    
    let query = model.find(filter);
    
    // Apply cursor condition
    if (cursor) {
      if (direction === 'next') {
        query = query.where(cursorField).gt(cursor);
      } else {
        query = query.where(cursorField).lt(cursor);
        sort = { [cursorField]: -1 };
      }
    }
    
    // Apply sorting
    query = query.sort(sort);
    
    // Apply population
    populate.forEach(pop => {
      query = query.populate(pop);
    });
    
    // Get one extra to check if there's more
    const results = await query.limit(limit + 1).lean();
    
    // Check if there are more items
    const hasMore = results.length > limit;
    
    // Remove extra item
    if (hasMore) {
      results.pop();
    }
    
    // Get next/prev cursors
    const nextCursor = hasMore ? results[results.length - 1][cursorField] : null;
    const prevCursor = cursor ? results[0][cursorField] : null;
    
    return {
      data: results,
      pagination: {
        nextCursor,
        prevCursor,
        hasMore,
        limit,
        direction
      }
    };
  }
}