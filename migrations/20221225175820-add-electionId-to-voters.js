"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("votersModel", "electionID", {
      type: Sequelize.DataTypes.INTEGER,
    });
    await queryInterface.addConstraint("votersModel", {
      fields: ["electionID"],
      type: "foreign key",
      references: {
        table: "electionsModel",
        field: "id",
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("votersModel", "electionID");
  },
};
