# ghostshot.deepanalve.dev: static site.
FROM nginx:1.29-alpine
COPY site/nginx.conf /etc/nginx/conf.d/default.conf
COPY site/ /usr/share/nginx/html/
# Concepts are design drafts, not pages. Version every stylesheet and script link by content,
# so Cloudflare and browsers never serve an old copy.
RUN rm -rf /usr/share/nginx/html/nginx.conf /usr/share/nginx/html/concepts && cd /usr/share/nginx/html \
 && for f in *.css *.js; do h=$(md5sum "$f" | cut -c1-10); sed -i "s#\"/$f\"#\"/$f?v=$h\"#g" *.html; done
