function updatePageInUrl(url, pageNumber) {
  const u = new URL(url);
  u.searchParams.set("page", String(pageNumber));
  return u.toString();
}

function updatePayloadPage(postData, pageNumber) {
  if (!postData) return null;

  const payload = JSON.parse(postData);

  // ✅ common paging fields
  if ("page" in payload) payload.page = pageNumber;
  if ("pageNo" in payload) payload.pageNo = pageNumber;
  if ("pageNumber" in payload) payload.pageNumber = pageNumber;

  // ✅ offset style
  if ("offset" in payload && "limit" in payload) {
    payload.offset = (pageNumber - 1) * payload.limit;
  }

  return payload;
}

module.exports = { updatePageInUrl, updatePayloadPage };
