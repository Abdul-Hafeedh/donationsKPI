# Let's check:
# User said:
# "Beløb doneret" should show the 3 most common donations and the (44) shows the amount of time that this amount have been recieved
# "Største beløb" should show the 5 biggest single amounts donated over the period, with the biggest being circled

# In our code, we want a function:
# calculateDashboardMetrics(donations: DonationTransaction[]):
# 1. Denominations frequency:
#    countMap = Map<amount, count>
#    sort by count descending -> slice(0, 3)
# 2. Largest amounts:
#    all amounts -> distinct or top 5 individual single donations sorted descending -> top 5:
#    biggest is circled!
