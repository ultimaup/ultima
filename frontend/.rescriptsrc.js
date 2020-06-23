module.exports = {
    devServer: function(opts) {
      return {
          ...opts,
          headers: {
              'Access-Control-Allow-Origin': '*'
        }
      }
    },
};