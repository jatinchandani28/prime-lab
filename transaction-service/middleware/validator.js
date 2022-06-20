const defaults = {};

// this middleware requires json body parser to be run first

module.exports.validatorMiddleware = (opts = {}) => {
  const {schema} = { ...defaults, ...opts };

  const validatorMiddlewareBefore = async (request) => {

      let paramsToValidate = request.event.body;
      if(opts.validateQueryString) {
          paramsToValidate = request.event.queryStringParameters;
      }

      const { error } = schema.validate(paramsToValidate);
      if(error != undefined){
        throw {statusCode: 400, message : JSON.stringify(error.details)};
      }
  };

  return {
    before: validatorMiddlewareBefore
  };
};
