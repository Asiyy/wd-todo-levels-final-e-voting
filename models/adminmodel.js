"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class adminModel extends Model {
    resetPass(password) {
      return this.update({ password });
    }

    static createAdmin({ firstName, lastName, email, password }) {
      return this.create({
        firstName,
        lastName,
        email,
        password,
      });
    }
    static associate(models) {
      // define association here
      adminModel.hasMany(models.electionsModel, {
        foreignKey: "adminID",
      });
    }
  }
  adminModel.init(
    {
      firstName: DataTypes.STRING,
      lastName: DataTypes.STRING,
      password: DataTypes.STRING,
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "adminModel",
      freezeTableName: true,
    }
  );
  return adminModel;
};
