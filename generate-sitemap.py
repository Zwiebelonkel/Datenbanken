# generate-sitemap.py
import json

def generate_sitemap():
    # the list of specific routes to ignore
    ignore_list=["/onem","/for"]
 
    # the list of route prefixes to ignore 
    ignore_startswith=["/utils", "/dash", "/login", "/logout", "/create", "/account", "/error", "/settings"]

    print("Generating sitemap.xml from scully-routes.json")

    with open(r'zahlenraten-game\src\assets\scully-routes.json') as f:
        data = json.load(f)
        f = open("sitemap.xml", "w")
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        f.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')

        for route in data:
            path = route["route"]
            if path not in ignore_list:
                if (not path.startswith(tuple(ignore_startswith))):
                    print(route["route"])
                    f.write('<url>\n')
                    f.write('<loc>https://outside---between.web.app'+path+'</loc>\n') ## << CHANGE
                    f.write('<changefreq>daily</changefreq>\n')
                    f.write('</url>\n')
                else:
                    print("SKIPPING: "+path)
            else:
                print("SKIPPING: "+path)
        f.write('</urlset>')
        f.close()

        print("SITEMAP GENERATED SUCCESSFULLY. Saved to src/sitemap.xml")

if __name__ == "__main__":
    generate_sitemap()

