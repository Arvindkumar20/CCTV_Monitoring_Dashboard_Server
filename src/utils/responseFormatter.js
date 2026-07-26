// utils/responseFormatter.js
class ResponseFormatter {
  static paginatedResponse(data, pagination, message = 'Success') {
    return {
      success: true,
      message,
      count: data.length,
      data,
      pagination
    };
  }
  
  static cursorPaginatedResponse(data, pagination, message = 'Success') {
    return {
      success: true,
      message,
      count: data.length,
      data,
      pagination
    };
  }
}