FROM nginx:alpine

# Remove o arquivo default de configuração do nginx
RUN rm -rf /etc/nginx/conf.d/*

# Copia nossa configuração otimizada com compressão gzip e cabeçalhos de segurança
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos estáticos da Landing Page (HTML, CSS, JS, assets)
COPY . /usr/share/nginx/html

# Expor porta padrão HTTP do Nginx
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
