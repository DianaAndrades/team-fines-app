import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'react-email'

type TeamInvitationEmailProps = {
  teamName: string
  role: string
  invitationsUrl: string
}

export function TeamInvitationEmail({
  teamName,
  role,
  invitationsUrl,
}: TeamInvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You were invited to {teamName}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={eyebrow}>TEAM FINES</Text>
          <Heading style={title}>Join {teamName}</Heading>
          <Text style={copy}>
            You have been invited to join {teamName} as <strong>{role}</strong>.
          </Text>
          <Text style={copy}>
            Open your invitations in Team Fines to review and accept the invitation.
          </Text>
          <Button href={invitationsUrl} style={button}>
            View invitation
          </Button>
        </Container>
      </Body>
    </Html>
  )
}

const body = {
  backgroundColor: '#0B0D10',
  color: '#F5F7FA',
  fontFamily: 'Arial, sans-serif',
  margin: 0,
  padding: '32px 16px',
}

const container = {
  backgroundColor: '#15181D',
  border: '1px solid #252A31',
  borderRadius: '16px',
  margin: '0 auto',
  maxWidth: '560px',
  padding: '32px',
}

const eyebrow = {
  color: '#22C55E',
  fontSize: '12px',
  fontWeight: '700',
  letterSpacing: '1.4px',
  margin: '0 0 12px',
}

const title = {
  color: '#F5F7FA',
  fontSize: '28px',
  lineHeight: '34px',
  margin: '0 0 24px',
}

const copy = {
  color: '#C9D1D9',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 14px',
}

const button = {
  backgroundColor: '#22C55E',
  borderRadius: '10px',
  color: '#0B0D10',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '700',
  marginTop: '12px',
  padding: '12px 18px',
  textDecoration: 'none',
}
