//Loads scene assets.
@return { Promise } 
//A promise that returns a collection of assets.

export function load() {

	const assets = new Map();
	const loadingManager = new LoadingManager();

	return new Promise((resolve, reject) => {

		loadingManager.onError = reject;
		loadingManager.onLoad = () => resolve(assets);

		// Load any textures or models here.
		loadingManager.onLoad();

	});

}
