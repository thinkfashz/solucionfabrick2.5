declare module 'three/examples/jsm/loaders/ColladaLoader.js' {
  import { Loader, LoadingManager, Object3D } from 'three';

  export interface Collada {
    scene: Object3D;
    animations: unknown[];
    kinematics: unknown;
    library: unknown;
  }

  export class ColladaLoader extends Loader<Collada> {
    constructor(manager?: LoadingManager);
    loadAsync(url: string, onProgress?: (event: ProgressEvent) => void): Promise<Collada>;
  }
}
