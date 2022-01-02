const dirTree = require('directory-tree');
const { gzip } = require('pako');

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
			data: gzip(JSON.stringify(tree), { to: 'string' })
		}
		res.send(result);
    });
}
