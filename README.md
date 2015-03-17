# ogdmatcher
A web-based tool to preview the up-to-date state of all OGD Vienna data.

This tool is a *couchapp* (http://docs.couchdb.org/en/latest/couchapp/) and relies on a running *CouchDB* instance (http://couchdb.apache.org/) with a working *GeoCouch* plugin (https://github.com/couchbase/geocouch/).

To be able to receive OGD data from the server, the CouchDB installation has to be configured to act as a proxy server (add the config value "_ogdviennacap	= {couch_httpd_proxy, handle_proxy_req, <<"http://data.wien.gv.at/daten/geo">>}" in the section "httpd_global_handlers" of the config file for CouchBD)
