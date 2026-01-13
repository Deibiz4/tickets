const Department = require('../models/department.model');

exports.getDepartments = async (req, res) => {
    try {
        const departments = await Department.findAll();
        res.json(departments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};
