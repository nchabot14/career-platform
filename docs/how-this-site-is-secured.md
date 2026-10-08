# How this site is secured

## Who issued your certificate, which names it covers, and when it expires

The certificate was issued by Let’s Encrypt. The names that are covered by the certificate are nickchabot.com  and www.nickchabot.com. The certificate expires January 6, 2027, 90 days after it was issued.

## How it renews

The renewal is fully automatic, with a systemd timer running Certbot twice a day, which Certbot will only the renew the certificate once it is close to expiring. These two runs of Certbot during the day take place at 00:00 and 12:00 UTC, and they have a random delay up to 12 hours. Certbot looks at every certificate that it manages, and if one has 30 days or less, it renews it. If not, it just silently ignores it.

## Which ports are open to the internet, and why each one is open

Three ports are open from the Internet, which are 22, 80, and 443. Port 22 is open under the rule Allow-SSH-Laptop, which can only be reached by my laptop’s public IP, and exists so that I can log in and manage the VM. Port 80 is open under the rule Allow-HTTP-80, which allows anyone to reach it, and it exists to redirect visitors to HTTPS. It is also crucial for the Certbot to prove that I am the owner of the domain when it automatically renews. Port 443 is open under the rule Allow-HTTPS, which can also be reached by anyone, just like port 80, and exists to serve the site over HTTPS, then passes the requests it receives to the app.

## Where encryption starts and where it ends

Encryption starts in the visitor’s browser and ends at nginx on my VM. Everything in the process from the browser to nginx is encrypted, as they both mutually agree on a key using the certificate. Everything in between these processes is encrypted, with the encryption ending when nginx decrypts the traffic on port 443. This is also called TLS termination.

## How a customer could check all this for themselves

They can check the encryption of the connection by going to the website, clicking the site-info icon, then “Connection is secure”, then “Certificate is valid”. Here, it will show all the information about the certificate, how it is issued by Let’s encrypt, the names nickchabot.com and www.nickchabot.com, and when the certificate expires. They can see that HTTP redirects to HTTPS by typing in http://nickchabot.com, which should automatically redirect them to https://nickchabot.com. They can run curl commands in their terminal to see that the browser is told always to use HTTPS,  as well as nmap commands to see which ports are open from the Internet.

## The output of the openssl command, as evidence

```
subject=CN = nickchabot.com
issuer=C = US, O = Let's Encrypt, CN = YE2
notBefore=Oct  8 16:23:45 2026 GMT
notAfter=Jan  6 16:23:44 2027 GMT
X509v3 Subject Alternative Name: 
    DNS:nickchabot.com, DNS:www.nickchabot.com
```
