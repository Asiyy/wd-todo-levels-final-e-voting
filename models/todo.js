"use strict";
const { Model, Op } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Todo extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
    static addaTodo({ title, dueDate }) {
      return this.create({ title: title, dueDate: dueDate, completed: false });
    }
    // static markAsCompleted() {
    //   return this.update({ completed: true });
    // }
    static getAllTodos() {
      return this.findAll({ order: [["id", "ASC"]] });
    }
    static async completedItemsAre() {
      return this.findAll({
        where: { completed: { [Op.eq]: true } },
        order: [["id", "DESC"]],
      });
    }
    static async remove(id) {
      return this.destroy({
        where: {
          id,
        },
      });
    }
    setCompletionStatusAs(bool) {
      return this.update({ completed: bool });
    }
    static async overdue() {
      return this.findAll({
        where: {
          dueDate: {
            [Op.lt]: new Date().toLocaleDateString("en-CA"),
          },
          completed: false,
        },
        order: [["id", "ASC"]],
      });
    }
    static async dueToday() {
      return this.findAll({
        where: {
          dueDate: {
            [Op.eq]: new Date().toLocaleDateString("en-CA"),
          },
          completed: false,
        },
        order: [["id", "ASC"]],
      });
    }
    static async dueLater() {
      return this.findAll({
        where: {
          dueDate: {
            [Op.gt]: new Date().toLocaleDateString("en-CA"),
          },
          completed: false,
        },
        order: [["id", "ASC"]],
      });
    }
  }

  Todo.init(
    {
      title: DataTypes.STRING,
      dueDate: DataTypes.DATEONLY,
      completed: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "Todo",
    }
  );
  return Todo;
};
