import dotenv from 'dotenv';
import { Client } from 'ldapts';
dotenv.config();

(async () => {
  const username = 'tanmv';
  const password = 'aA123456!1';

  const client = new Client({
    url: `${process.env.LDAP__SERVER}:${process.env.LDAP__PORT}`,
    timeout: 10000,
    connectTimeout: 10000,
    ...(process.env.LDAP__SERVER?.startsWith('ldaps')
      ? {
          tlsOptions: {
            rejectUnauthorized: false, // ❗ Bỏ qua verify CA
          },
        }
      : {}),
  });

  try {
    await client.bind(`${username}@${process.env.LDAP__UPN_SUFFIX}`, password);
    console.log('Login success');

    // 2. Search thông tin user
    const { searchEntries } = await client.search(process.env.LDAP__BASEDN, {
      scope: 'sub',
      filter: `(sAMAccountName=${username})`,
      attributes: [
        'cn',
        'mail',
        'memberOf',
        'displayName',
        'givenName',
        'sn',
        'uid',
        'userPrincipalName',
        'sAMAccountName',
      ],
    });

    console.log('User info:', searchEntries[0]);
    /*{
      dn: 'CN=Mạc Văn Tân,OU=KyThuat,DC=nextpay,DC=local',
      cn: 'Mạc Văn Tân',
      givenName: 'Mac Van Tan - 15000596',
      displayName: 'Mạc Văn Tân - SE - KCN - 15000596',
      sAMAccountName: 'tanmv',
      userPrincipalName: 'tanmv@nextpay.local',
      mail: 'tanmv@mpos.vn',
      memberOf: [],
      sn: [],
      uid: []
    }*/
  } catch (e) {
    console.error(e);
    console.log('Login failed');
  } finally {
    await client.unbind();
  }
})();
