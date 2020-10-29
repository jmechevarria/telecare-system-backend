const SubscriptionHandler = {
  // async delete(req, res) {
  //   console.log(req.params);
  //   try {
  //     const { subscription_endpoint, user_id } = req.params;
  //     await SubscriptionController.deleteByEndpoint({
  //       endpoint: subscription_endpoint,
  //       user_id
  //     });
  //     //since several users can subscribe from the same device (same endpoint),
  //     //we check if the endpoint is still being used by other users, if no, a response is sent
  //     //that tells the client to unsubscribe from the
  //     const left = await SubscriptionController.findByEndpoint(subscription_endpoint);
  //     console.log(left.rows, left.rowCount);
  //     return res.status(200).send(left);
  //   } catch (error) {
  //     console.log(error.toString());
  //     return res.status(500).send(RESPONSES.GENERIC_500);
  //   }
  // }
};

export default SubscriptionHandler;
