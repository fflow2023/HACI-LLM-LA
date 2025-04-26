import { networkInterfaces } from 'os';

export function getLocalIP(): string {
    const interfaces = networkInterfaces();

    for (const interfaceName of Object.keys(interfaces)) {
        const addresses = interfaces[interfaceName];

        if (!addresses) continue;

        for (const addressInfo of addresses) {
            if (addressInfo.family === 'IPv4' && !addressInfo.internal) {
                return addressInfo.address;
            }
        }
    }

    return 'localhost';
}