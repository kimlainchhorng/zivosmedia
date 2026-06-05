export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    url.protocol = "https:";
    url.hostname = "zivosmedia.com";
    return Response.redirect(url.toString(), 301);
  },
};
