const dirTree = require('directory-tree');

module.exports = function (app) {

	// Get directories structure
	app.get('/api/tree', (req, res) => {

		const tree = dirTree(global.gConfig.pathToSimulations, { extensions: /\.(smv|json)/ });

		result = {
			meta: {
				status: 'success',
				from: 'getTreeStructure()',
				details: ['Get directories structure from local storage']
			},
			data: {
				tree: tree
			}
		}
		res.send(result)
    });
}
