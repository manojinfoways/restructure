// database related modules
module.exports = {
  databaseConnection: require("./connection"),
  ProductRepository: require("./repository/product-repository"),
  CustomerRepository: require("./repository/customer-repository"),
  ProducerRepository: require("./repository/producer-repository"),
  AdminRepository: require("./repository/admin-repository"),
  ShoppingRepository: require("./repository/shopping-repository"),
  ReturnPolicyRepository: require("./repository/returnPolicy-repository"),
};
