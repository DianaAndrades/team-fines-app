import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'react-email'

type FineNotificationEmailProps = {
  preview: string
  heading: string
  teamName: string
  playerName: string
  reason: string
  currentAmount: string
  nextAmount?: string
  fineUrl: string
}

export function FineNotificationEmail({
  preview,
  heading,
  teamName,
  playerName,
  reason,
  currentAmount,
  nextAmount,
  fineUrl,
}: FineNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={eyebrow}>TEAM FINES · {teamName}</Text>
          <Heading style={title}>{heading}</Heading>
          <Text style={copy}>Hi {playerName},</Text>
          <Text style={copy}>{reason}</Text>
          <Section style={amountPanel}>
            <Text style={amountLabel}>Current amount</Text>
            <Text style={amount}>{currentAmount}</Text>
            {nextAmount ? (
              <>
                <Text style={amountLabel}>Next amount</Text>
                <Text style={nextAmountStyle}>{nextAmount}</Text>
              </>
            ) : null}
          </Section>
          <Button href={fineUrl} style={button}>
            View fine
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
  margin: '0 0 12px',
}

const amountPanel = {
  backgroundColor: '#0B0D10',
  border: '1px solid #252A31',
  borderRadius: '12px',
  margin: '24px 0',
  padding: '20px',
}

const amountLabel = {
  color: '#8B949E',
  fontSize: '12px',
  margin: '0 0 4px',
  textTransform: 'uppercase' as const,
}

const amount = {
  color: '#F5F7FA',
  fontSize: '26px',
  fontWeight: '700',
  margin: '0 0 16px',
}

const nextAmountStyle = {
  color: '#F5F7FA',
  fontSize: '20px',
  fontWeight: '700',
  margin: 0,
}

const button = {
  backgroundColor: '#22C55E',
  borderRadius: '10px',
  color: '#0B0D10',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '700',
  padding: '12px 18px',
  textDecoration: 'none',
}
