const path = require('path');
const dirTree = require('directory-tree');

module.exports = function (app) {

	// Get directories structure
	//
	// Plain JSON, as of #148: the payload used to be gzipped by hand into a
	// string that the browser had to unpack with pako, which bought nothing the
	// transport does not already do and cost the client a compression library.
	app.get('/api/tree', (req, res) => {

		const root = global.gConfig.pathToSimulations;
		const tree = dirTree(root, { extensions: /\.(smv|json)/ });

		const result = {
			meta: {
				status: 'success',
				from: 'getTreeStructure()',
				details: ['Get directories structure from local storage']
			},
			// A root that is not there answers null, as it always did - the
			// server is misconfigured, and that is the client's problem to show.
			data: tree === null ? null : fromRoot(tree, root)
		}
		res.send(result);
    });
}

/**
 * Retrace every node's `path` from the simulations root.
 *
 * `directory-tree` reports where each entry sits on the server's disk, which
 * is both more than the browser has any business knowing and unusable as an
 * address: the client turns these paths into `/api/results/...` URLs, and that
 * route resolves them against the very same root. Windows separators go with
 * the prefix - a URL only ever knows `/`.
 */
function fromRoot(node, root) {
	const relative = path.relative(root, node.path).split(path.sep).join('/');
	const rebased = Object.assign({}, node, { path: relative });

	if (node.children) {
		rebased.children = node.children.map(child => fromRoot(child, root));
	}

	return rebased;
}
