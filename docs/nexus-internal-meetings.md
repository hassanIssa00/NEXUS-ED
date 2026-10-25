# Nexus EDU internal meetings

Nexus meetings use the platform's own scheduling, invitation, authorization, and interface with a self-hosted LiveKit SFU for audio/video transport. Meeting URLs point to Nexus, and the application does not send meeting media to Zoom or Google Meet. This release does not record rooms.

## Access model

- Active student, parent, and school staff accounts can join meetings they were invited to.
- Teachers can schedule class sessions for enrolled students in their assigned classes, or parent meetings for parent accounts linked to students in those classes.
- Only the principal (`PRINCIPAL`) and school administration affairs (`HR`) can create a school-wide staff meeting. That meeting invites all active employee accounts in the same school.
- Meeting records and invitations are scoped to the signed-in account's school. Teachers cannot invite a parent who is not linked to a student in the selected class.
- Meeting links do not provide guest access: opening a link requires an active platform login and the server confirms the account is a meeting participant before issuing a room token. The participant display name comes from the platform account.
- A room token is issued only after the API confirms that the user is invited and the account is active. The time-limited token grants access to one room.
- The meeting host, principal, and school administration affairs can end a room or remove a participant; removal revokes that participant's current room token.
- The camera is off when joining. The microphone is enabled only after the participant explicitly joins with audio. Video capture is limited to 360p/15 fps, with adaptive subscriptions and dynacast enabled.
- In-room chat and raised hands use the live room data channel; messages are not written to the database.

## Local development

Start the development SFU:

```powershell
docker compose -f docker-compose.meetings.dev.yml up -d
```

Set these values in the local `apps/api/.env` used by the API process:

```dotenv
LIVEKIT_INTERNAL_URL=http://localhost:7880
LIVEKIT_PUBLIC_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

The local `--dev` key pair is for development only. Never use it in a public deployment. The API can still list/schedule meetings without the SFU, but joining a room returns an explicit configuration error until the service and API variables are present.

The web application's Content Security Policy must allow the same public URL through `NEXT_PUBLIC_LIVEKIT_URL` so the browser can open the protected WebSocket connection.

## Self-hosted production

The production compose file starts the SFU, proxies its TLS signaling endpoint at `meetings.<DOMAIN_NAME>`, and gives the API a private service address for room management. Before deploying:

1. Add a DNS `A` record for `meetings.<DOMAIN_NAME>` to the same public server address as the main site. Caddy provisions TLS for the meeting subdomain. Set `NEXT_PUBLIC_LIVEKIT_URL=wss://meetings.<DOMAIN_NAME>` for the web build.
2. Set a unique `LIVEKIT_API_KEY`, a cryptographically random `LIVEKIT_API_SECRET` (at least 32 random bytes), and the server's public IPv4 in `LIVEKIT_NODE_IP` in `.env.production`.
3. Open inbound TCP `80` and `443`, TCP `7881`, and UDP `50000-51000` in the host/cloud firewall. Keep port `7880` private; Caddy reaches it over the Compose network.
4. Deploy with the normal `docker-compose.prod.yml` process so the Prisma migration runs with the application.
5. Check `docker compose -f docker-compose.prod.yml logs livekit api proxy` and join a meeting from two separate devices/networks. Confirm microphone permissions, audio in both directions, camera opt-in, and screen sharing.

LiveKit uses WebRTC: its signaling and server APIs are separate from the UDP/TCP media paths, so both the DNS/TLS proxy and the media firewall rules are required. A single SFU node is the starting deployment; capacity depends on the host CPU, network bandwidth, and concurrent video streams. For bigger multi-school rollout, benchmark the actual workload and add a multi-node/Redis deployment before increasing the room size.

The production environment values are included in `.env.production.example`. Do not commit the real `.env.production` file or the API secret.
