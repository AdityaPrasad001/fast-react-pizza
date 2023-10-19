import { useState } from "react";
import { Form, redirect, useActionData, useNavigation } from "react-router-dom";
import { createOrder } from "../../services/apiRestaurant";
import Button from "../../ui/Button";
import { useDispatch, useSelector } from "react-redux";
import { clearCart, getCart, getCartTotalPrice } from "../cart/cartSlice";
import EmptyCart from "../cart/EmptyCart";
import store from "../../store";
import { formatCurrency } from "../../utils/helpers";
import { fetchAddress } from "../user/userSlice";

// https://uibakery.io/regex-library/phone-number
const isValidPhone = (str) =>
  /^\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/.test(
    str,
  );

function CreateOrder() {
  const dispatch = useDispatch();
  const [withPriority, setWithPriority] = useState(false);
  const cart = useSelector(getCart);
  const {
    username,
    status: addressStatus,
    position,
    address,
    error: addressError,
  } = useSelector((state) => state.user);

  const isLoadingAddress = addressStatus === "loading";

  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const totalCartPrice = useSelector(getCartTotalPrice);

  const finalOrderValue = withPriority ? 1.2 * totalCartPrice : totalCartPrice;

  // the data which is been returned from the action, can be caught using "useActionData";
  const formErrors = useActionData();

  const inputDivStyles = {
    div: "mb-5 flex flex-col gap-2 sm:flex-row sm:items-center",
    label: "sm:basis-40",
  };

  if (!cart.length) <EmptyCart />;

  return (
    <div className="px-4 py-6">
      <h2 className="mb-8 text-xl font-semibold">Ready to order? Let's go!</h2>

      {/* <Form method="POST" action="/order/new"> */}
      <Form method="POST">
        <div className={`${inputDivStyles.div}`}>
          <label className={`${inputDivStyles.label}`}>First Name</label>
          <input
            className="input grow"
            type="text"
            name="customer"
            required
            defaultValue={username}
          />
        </div>

        <div className={`${inputDivStyles.div}`}>
          <label className={`${inputDivStyles.label}`}>Phone number</label>
          <div className="grow">
            <input className="input w-full" type="tel" name="phone" required />
            {formErrors?.phone && (
              <p className="mt-2 rounded-md bg-red-100 p-2 text-xs text-red-700">
                {formErrors.phone}
              </p>
            )}
          </div>
        </div>

        <div className={`${inputDivStyles.div} relative`}>
          <label className={`${inputDivStyles.label}`}>Address</label>
          <div className="grow ">
            <input
              type="text"
              name="address"
              required
              className="input w-full"
              disabled={isLoadingAddress}
              defaultValue={address}
            />
            {addressStatus === "error" && (
              <p className="mt-2 rounded-md bg-red-100 p-2 text-xs text-red-700">
                {addressError}
              </p>
            )}
          </div>
          {!position.latitude && !position.longitude && (
            <span className="z-5 absolute right-[3px] top-[35px] sm:right-[3px] sm:top-[3px] md:right-[5px] md:top-[5px]">
              <Button
                type="small"
                disabled={isLoadingAddress}
                onClick={(e) => {
                  e.preventDefault();
                  dispatch(fetchAddress());
                }}
              >
                Get Position
              </Button>
            </span>
          )}
        </div>

        <div className="mb-12 flex items-center gap-5">
          <input
            className="focus:ring-outline-2 h-6 w-6 accent-yellow-400 hover:cursor-pointer focus:outline-none focus:ring focus:ring-yellow-400 focus:ring-offset-2"
            type="checkbox"
            name="priority"
            id="priority"
            value={withPriority}
            onChange={(e) => setWithPriority(e.target.checked)}
          />
          <label htmlFor="priority">Want to yo give your order priority?</label>
        </div>

        <div>
          {/* To get the cart data into the action, we can use a hidden input inside of this form */}
          <input type="hidden" name="cart" value={JSON.stringify(cart)} />
          <input
            type="hidden"
            name="position"
            value={
              position.latitude && position.longitude
                ? `${position.latitude},${position.longitude}`
                : ""
            }
          />
          <Button disabled={isSubmitting || isLoadingAddress} type="primary">
            {isSubmitting
              ? "Placing Order..."
              : `Order now for ${formatCurrency(finalOrderValue)}`}
          </Button>
        </div>
      </Form>
    </div>
  );
}

export async function action({ request }) {
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  // modelling the recieved data
  const order = {
    ...data,
    cart: JSON.parse(data.cart),
    priority: data.priority === "true",
  };

  const errors = {};
  if (!isValidPhone(order.phone)) {
    errors.phone =
      "Please give us your correct phone number. We might need it to contact you.";
  }
  // checking that if errors have any property, we need to return error.
  if (Object.keys(errors).length > 0) return errors;

  // posting the form data and creating a new order.
  const newOrder = await createOrder(order);

  store.dispatch(clearCart());

  // new after placing the order we need to redirect the applicaiton to the new posted order page, for that we need to navigate to "order/:id", but we can not use the useNavigate hook, as this is outside the react component. There is an alternative for this "redirect()" funciton provided by react-router.
  return redirect(`/order/${newOrder.id}`);
}

export default CreateOrder;
