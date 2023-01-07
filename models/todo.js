"use strict";
const { Op, where } = require("sequelize");
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Todo extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Todo.belongsTo(models.User, {
        foreignKey: "userID",
      });
      // define association here
    }

    static async addaTodo({ title, dueDate, userID }) {
      return this.create({
        title: title,
        dueDate: dueDate,
        completed: false,
        userID,
      });
    }

    static async overDue(userID) {
      return await Todo.findAll({
        where: {
          dueDate: {
            [Op.lt]: new Date(),
          },
          userID,
          completed: false,
        },
        order: [["id", "ASC"]],
      });
    }

    static async dueToday(userID) {
      return await Todo.findAll({
        where: {
          dueDate: {
            [Op.eq]: new Date(),
          },
          userID,
          completed: false,
        },
        order: [["id", "ASC"]],
      });
    }

    static async completedItemsAre(userID) {
      return await Todo.findAll({
        where: {
          completed: true,
          userID,
        },
      });
    }

    static async dueLater(userID) {
      return await Todo.findAll({
        where: {
          dueDate: {
            [Op.gt]: new Date(),
          },
          userID,
          completed: false,
        },
        order: [["id", "ASC"]],
      });
    }

    

    static async remove(id, userID) {
      return this.destroy({
        where: {
          id,
          userID,
        },
      });
    }

    static async getTodos(userID) {
      return this.findAll({
        where: {
          userID,
        },
      });
    }

  setCompletionStatusAs(status) {
      return this.update({ completed: status });
    }
  }
  
  Todo.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: true,
          len: 5,
        },
      },
      dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
          notNull: true,
        },
      },
      completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "Todo",
    }
  );
  return Todo;
};
