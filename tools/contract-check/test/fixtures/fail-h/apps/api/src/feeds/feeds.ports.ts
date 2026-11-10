export interface FeedReader {
  open(): Promise<string>;
}
