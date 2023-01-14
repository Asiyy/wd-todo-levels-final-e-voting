"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class questionsModel extends Model {
    static async getNumberOfQuestions(electionID) {
      return await this.count({
        where: {
          electionID,
        },
      });
    }

    static updateQuestion({ question, description, id }) {
      return this.update(
        {
          question,
          description,
        },
        {
          returning: true,
          where: {
            id,
          },
        }
      );
    }

    static addQuestion({ question, description, electionID }) {
      return this.create({
        question,
        description,
        electionID,
      });
    }

    static async getQuestion(id) {
      return await this.findOne({
        where: {
          id,
        },
      });
    }

    static deleteQuestion(id) {
      return this.destroy({
        where: {
          id,
        },
      });
    }

    static async getQuestions(electionID) {
      return await this.findAll({
        where: {
          electionID,
        },
        order: [["id", "ASC"]],
      });
    }

    static associate(models) {
      // define association here
      questionsModel.belongsTo(models.electionsModel, {
        foreignKey: "electionID",
      });

      questionsModel.hasMany(models.optionsModel, {
        foreignKey: "questionID",
      });
    }
  }
  questionsModel.init(
    {
      question: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "questionsModel",
      freezeTableName: true,
    }
  );
  return questionsModel;
};
