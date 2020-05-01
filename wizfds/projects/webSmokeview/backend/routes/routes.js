const fs = require('fs');
const dirTree = require('directory-tree');
const { execSync } = require("child_process");

module.exports = function (app) {

	// Get slices
	app.get('/api/slices', (req, res) => {
		// read local file
		fs.readFile('example/slices.json', (err, data) => {
			// TODO: perform error handling
			if (err) throw err;

			let slice = JSON.parse(data);
			result = {
				meta: {
					status: 'success',
					from: '...',
					details: ['Getting slice']
				},
				data: {
					vertices: slice.vertices,
					indices: slice.indices,
					texData: slice.texData,
					blank: slice.blank
				}
			}
			res.send(result)
		});

	});

};
