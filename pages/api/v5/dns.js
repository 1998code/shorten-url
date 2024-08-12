import dns from 'dns';

export default async function handler(req, res) {
  const { domain } = req.query;
  const { address: ip } = await dns.promises.lookup(domain);

  if (typeof ip !== 'string') {
    res.status(400).send('Invalid IP address');
    return;
  }

  // IP string start with 76.76.21.
  const validIP = ip.startsWith('76.76.21.');

  if (validIP) {
    res.status(200).send('Setup Completed');
  } else {
    res.status(400).send('Pending for Configuring DNS');
  }
}