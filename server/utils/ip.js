/** IP del cliente sin el puerto que añaden algunos balanceadores; con él, el límite cambiaría de clave. */
const ipDe = (req) => {
  const ip = String(req.ip ?? '');
  const ipv4ConPuerto = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(ip);
  if (ipv4ConPuerto) return ipv4ConPuerto[1];
  const ipv6ConPuerto = /^\[([0-9a-f:.]+)\]:\d+$/i.exec(ip);
  return ipv6ConPuerto ? ipv6ConPuerto[1] : ip;
};

module.exports = { ipDe };
