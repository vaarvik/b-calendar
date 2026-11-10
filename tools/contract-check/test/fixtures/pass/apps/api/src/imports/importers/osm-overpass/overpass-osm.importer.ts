import type { SourceImporter } from './osm-overpass.ports.js';

export class OverpassOsmImporter implements SourceImporter {
  public readonly source = 'osm_overpass';
}
