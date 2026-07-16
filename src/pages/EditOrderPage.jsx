import { useParams } from '@tanstack/react-router'
import OrderFormView from '../shared/OrderFormView'

function EditOrderPage() {
  const { orderId } = useParams({ strict: false })

  return <OrderFormView mode="edit" orderId={orderId} />
}

export default EditOrderPage
