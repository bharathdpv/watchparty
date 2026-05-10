import WatchRoom from './WatchRoom'

export default async function WatchPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const { roomId } = await params
  return <WatchRoom roomId={roomId} />
}
