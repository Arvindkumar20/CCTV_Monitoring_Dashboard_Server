// utils/paginationBuilder.js
class PaginationBuilder {
  constructor(model, req) {
    this.model = model;
    this.req = req;
    this.query = model.find();
    this.filter = {};
    this.sort = { createdAt: -1 };
    this.populate = [];
    this.select = null;
  }
  
  // Filter methods
  addFilter(filter) {
    this.filter = { ...this.filter, ...filter };
    return this;
  }
  
  addTextSearch(fields, searchTerm) {
    if (searchTerm && fields.length > 0) {
      const searchRegex = new RegExp(searchTerm, 'i');
      const searchConditions = fields.map(field => ({
        [field]: { $regex: searchRegex }
      }));
      this.filter.$or = searchConditions;
    }
    return this;
  }
  
  // Sorting
  setSort(sortField, order = 'desc') {
    this.sort = { [sortField]: order === 'desc' ? -1 : 1 };
    return this;
  }
  
  // Field selection
  selectFields(fields) {
    this.select = fields.join(' ');
    return this;
  }
  
  // Population
  populateFields(path, select = '') {
    this.populate.push({ path, select });
    return this;
  }
  
  // Execute pagination
  async paginate() {
    const page = parseInt(this.req.query.page) || 1;
    const limit = parseInt(this.req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Apply filter
    if (Object.keys(this.filter).length > 0) {
      this.query = this.query.find(this.filter);
    }
    
    // Get total count
    const totalItems = await this.model.countDocuments(this.filter);
    
    // Apply query modifications
    if (this.sort) {
      this.query = this.query.sort(this.sort);
    }
    
    if (this.select) {
      this.query = this.query.select(this.select);
    }
    
    if (this.populate.length > 0) {
      this.populate.forEach(pop => {
        this.query = this.query.populate(pop);
      });
    }
    
    // Apply pagination
    const data = await this.query
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Calculate metadata
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
}